import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import Groq from "groq-sdk";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const groq = new Groq({
    apiKey: process.env["GROQ_API_KEY"],
});

interface PineconeHit {
    _id?: string;
    _score?: number;
    fields: {
        title?: string;
        url?: string;
    };
}

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Missing query text' }, { status: 400 });
        }

        console.log(text)

        const responseChunks: string[] = [];

        const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant that extracts **concise** STEM concepts directly from the question and formats them into a structured JSON response. **Always respond in JSON format, even for non-STEM questions.**  \n\n### Guidelines:  \n- **Rephrase the key concept(s) from the question** in a natural, descriptive way.  \n- **Use the terminology from the question** when possible, slightly adjusted for clarity.  \n- Format your response as a JSON object with a **single key** `\"concepts\"`, mapping to a **comma-separated string** of concepts.  \n- Ensure the output remains **short and focused**, avoiding redundant or generic terms.  \n\n### Example Inputs & Outputs:  \n\n#### **STEM Example 1**  \n**Input:** *\"What is the derivative of a function?\"*  \n**Output:**  \n```json\n{ \n  \"concepts\": \"derivatives of functions\"\n}\n```\n\n#### **STEM Example 2**  \n**Input:** *\"Use the Chain Rule to find the indicated partial derivatives.\"*  \n**Output:**  \n```json\n{ \n  \"concepts\": \"Chain Rule with partial derivatives\"\n}\n```\n\n#### **Non-STEM Example**  \n**Input:** *\"What is the capital of France?\"*  \n**Output:**  \n```json\n{ \n  \"concepts\": \"capital of France\"\n}\n```"
        },
                    {
                        role: "user",
                        content: text,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 1.4,
                max_tokens: 4096,
                top_p: 0.95,
                stream: true,
                stop: null,
            });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || "";
            responseChunks.push(content);
        }

        const fullResponse = responseChunks.join("").trim();

        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : fullResponse;

        console.log(jsonString)

        let extractedConcepts = "";
        try {
            const parsedJSON = JSON.parse(jsonString);
            extractedConcepts = parsedJSON.concepts;
        } catch (error) {
            return NextResponse.json({ error: 'Invalid JSON response', details: error }, { status: 500 });
        }

        console.log(extractedConcepts)

        if (!extractedConcepts) {
            return NextResponse.json({ error: 'No concepts extracted' }, { status: 500 });
        }

        const namespace = pc.index(
            process.env.PINECONE_INDEX!,
            process.env.PINECONE_HOST!
        ).namespace("youtube_videos_v2");

        const response = await namespace.searchRecords({
            query: {
                topK: 10,
                inputs: { text: `${text}. ${extractedConcepts}.` },
            },
            fields: ['title', 'url'],
        });

        const formattedData = response.result.hits.map((hit: PineconeHit) => ({
            title: hit.fields.title,
            url: hit.fields.url,
            similarity_score: hit._score,
        }));

        return NextResponse.json(formattedData);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to query Pinecone', details: error },
            { status: 500 }
        );
    }
}