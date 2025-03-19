"use client"

import React, { useState, useRef, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ModeToggle } from "@/components/mode-toggle"
import SearchResults from "@/components/search-results"
import SearchSuggestions from "@/components/search-suggestions"
import gsap from "gsap"

const SUGGESTIONS = [
  "What is the derivative of a function?",
  "How do you solve a system of linear equations?",
  "What are Newton's laws of motion?",
  "How does chemical equilibrium work?",
  "What is the difference between DNA and RNA?",
  "How do integrals relate to area under a curve?",
  "What are the fundamental forces of physics?",
  "How does the pH scale work in chemistry?",
  "What is the Pythagorean theorem used for?",
  "How does probability theory apply to real-world problems?"
]

interface SearchResult {
  title: string
  url: string
  similarity_score: number
}

const fetchSearchResults = async (query: string, retries: number = 10) => {
  if (!query.trim()) return { query: "", results: [] }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query }),
      })

      if (!response.ok) throw new Error("Failed to fetch results")

      const results = await response.json()
      return { query, results }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error)
      if (attempt === retries) {
        console.error("All attempts failed. Returning empty results.")
        return { query, results: [] }
      }
    }
  }
}

export default function SearchEngine() {
  const [query, setQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 20,
        duration: 1,
        ease: "power3.out",
      })
    }
  }, [])

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;
  
    setIsLoading(true);
    setError("");
    setHasSearched(true);
  
    try {
      const data = await fetchSearchResults(finalQuery);
      setResults(data?.results);
    } catch (err) {
      setError(`${err}`);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setShowSuggestions(e.target.value.length > 0)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
    handleSearch(suggestion);
  }

  const filteredSuggestions = SUGGESTIONS.filter((suggestion) =>
    suggestion.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 5)

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-300">
          ORGSearch
        </h1>
        <ModeToggle />
      </div>

      <div className="relative mb-8">
        <div className="flex">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search for STEM related concepts..."
              className="appearance-none pl-4 pr-4 py-6 text-lg w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(query.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
          </div>
          <Button
            className="ml-2 px-6 py-6 bg-gradient-to-r from-neutral-600 to-neutral-700 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105"
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
          </Button>
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <SearchSuggestions suggestions={filteredSuggestions} onSuggestionClick={handleSuggestionClick} />
        )}
      </div>

      {error && (
        <Card className="p-4 mb-6 border-destructive bg-destructive/10 text-destructive backdrop-blur-md">
          {error}
        </Card>
      )}

      {hasSearched && query.trim() && !isLoading && results.length === 0 && !error && (
        <Card className="p-6 text-center bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
          <p className="text-lg">No results found for {query}</p>
          <p className="text-muted-foreground mt-2">Try a different search term or check your spelling</p>
        </Card>
      )}

      {isLoading ? (
        <SearchResults isLoading={true} results={[]} />
      ) : (
        <SearchResults isLoading={false} results={results} />
      )}
    </div>
  )
}