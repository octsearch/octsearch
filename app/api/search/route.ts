import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import Groq from "groq-sdk";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const groq = new Groq({
    apiKey: process.env["GROQ_API_KEY"],
});

async function retry<T>(fn: () => Promise<T>, retries: number = 10, delay: number = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries === 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * 2);
    }
}

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Missing query text' }, { status: 400 });
        }

        const responseChunks: string[] = [];

        const chatCompletion = await retry(async () => {
            return await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant that specializes in identifying the key STEM concepts required to solve a given problem. When provided with a STEM-related question, your task is to analyze the problem and return a structured JSON response containing a list of fundamental concepts necessary for solving it.  \n\nFollow these guidelines:  \n\n- Extract and list **all** relevant concepts that contribute to solving the problem.  \n- Concepts should be **fundamental principles**, **laws**, **theorems**, **formulas**, or **methods**.  \n- Format your response as a JSON object with a **single key** `\"concepts\"`, mapping to a **comma-separated string** of concepts.  \n- Keep the list **concise yet comprehensive**, avoiding redundancy.  \n\n**Example Input:**  \n\"A car accelerates uniformly from rest at a rate of 3 m/s² for 5 seconds. What is its final velocity?\"  \n\n**Example Output:**  \n```json\n{ \n  \"concepts\": \"Kinematic Equations, Acceleration, Initial Velocity, Final Velocity, Time, Uniform Acceleration Formula\"\n}\n```"
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
        });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || "";
            responseChunks.push(content);
        }

        const fullResponse = responseChunks.join("").trim();

        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        let jsonString = jsonMatch ? jsonMatch[1].trim() : fullResponse;

        let extractedConcepts = "";
        try {
            const parsedJSON = JSON.parse(jsonString);
            extractedConcepts = parsedJSON.concepts;
        } catch (error) {
            return NextResponse.json({ error: 'Invalid JSON response', details: error }, { status: 500 });
        }

        if (!extractedConcepts) {
            return NextResponse.json({ error: 'No concepts extracted' }, { status: 500 });
        }

        const namespace = pc.index(
            process.env.PINECONE_INDEX!,
            process.env.PINECONE_HOST!
        ).namespace("youtube_videos_v2");

        const response = await retry(async () => {
            return await namespace.searchRecords({
                query: {
                    topK: 10,
                    inputs: { text: `${text}. ${extractedConcepts}.` },
                },
                fields: ['title', 'url'],
            });
        });

        const formattedData = response.result.hits.map((hit: any) => ({
            title: hit.fields.title.replace(/\b(?:Introduction|Guide|Basics|Concepts)\b/i, text),
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