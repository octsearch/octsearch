"use client"

import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface SearchResult {
  title: string
  url: string
  similarity_score: number
}

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
}

export default function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-10 bg-muted rounded w-32"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <ResultItem key={index} result={result} />
      ))}
    </div>
  )
}

function ResultItem({ result }: { result: SearchResult }) {
  const scorePercentage = Math.round(result.similarity_score * 100)

  return (
    <Card className="p-4 transition-all hover:shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-1">{result.title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Relevance: {scorePercentage}%
            </Badge>
            <div className="relative w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: `${scorePercentage}%` }}></div>
            </div>
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2" onClick={() => window.open(result.url, "_blank")}>
          Watch Video
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

