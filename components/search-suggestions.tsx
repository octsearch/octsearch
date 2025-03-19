"use client"

import { Card } from "@/components/ui/card"

interface SearchSuggestionsProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
}

export default function SearchSuggestions({ suggestions, onSuggestionClick }: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <Card className="absolute z-10 w-full mt-1 overflow-hidden">
      <ul className="py-1">
        {suggestions.map((suggestion, index) => (
          <li
            key={index}
            className="px-4 py-2 hover:bg-muted cursor-pointer transition-colors"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </li>
        ))}
      </ul>
    </Card>
  )
}