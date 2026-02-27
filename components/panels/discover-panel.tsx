'use client';

import { useState } from 'react';
import type { Trip, DiscoverResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Compass, Search } from 'lucide-react';

export function DiscoverPanel({ trip }: { trip: Trip }) {
  const [query, setQuery] = useState('');
  const [updateItinerary, setUpdateItinerary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoverResult[]>([]);

  async function search() {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`/api/trip/${trip.id}/discover/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() || undefined, updateItinerary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 p-4 backdrop-blur">
        <h1 className="text-xl font-semibold">Discover</h1>
        <p className="text-sm text-muted-foreground">Research your destination and use results to improve your itinerary.</p>
        <div className="mt-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="discover-query">Search</Label>
            <Input
              id="discover-query"
              placeholder="e.g. best restaurants, hidden gems"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={updateItinerary}
              onChange={(e) => setUpdateItinerary(e.target.checked)}
              className="rounded border-input"
            />
            Update itinerary with findings
          </label>
          <Button onClick={search} disabled={loading} className="gap-1">
            <Search className="h-4 w-4" />
            {loading ? 'Searching…' : 'Search'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {results.length === 0 && !loading ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Compass className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No results yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter a search or click Search to get tips for {trip.destination}.
                </p>
              </CardContent>
            </Card>
          ) : (
            results.map((r, i) => (
              <Card key={i}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium">{r.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{r.snippet}</p>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-1 inline-block">
                      {r.url}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
