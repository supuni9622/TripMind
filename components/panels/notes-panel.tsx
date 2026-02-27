'use client';

import { useState } from 'react';
import type { Trip } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, StickyNote } from 'lucide-react';

interface NoteResult {
  id: string;
  text: string;
  score?: number;
}

export function NotesPanel({ tripId, trip, onUpdate }: { tripId: string; trip: Trip; onUpdate: (t: Trip) => void }) {
  const [noteText, setNoteText] = useState('');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NoteResult[]>([]);

  async function addNote() {
    if (!noteText.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/trip/${tripId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...trip, notes: data.notes || trip.notes });
      setNoteText('');
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/trip/${tripId}/notes/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  const notes = trip.notes || [];
  const emptyNotes = notes.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 p-4 backdrop-blur">
        <h1 className="text-xl font-semibold">Notes & search</h1>
        <p className="text-sm text-muted-foreground">Add notes and search them by meaning (embeddings).</p>
        <div className="mt-4 space-y-2">
          <div>
            <Label htmlFor="note-text">Add note</Label>
            <Textarea
              id="note-text"
              placeholder="e.g. Remember to book museum tickets on Tuesday"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
            <Button onClick={addNote} disabled={adding || !noteText.trim()} size="sm" className="mt-2">
              {adding ? 'Adding…' : 'Add note'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="notes-query">Search notes</Label>
              <Input
                id="notes-query"
                placeholder="e.g. museum tickets"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="mt-1"
              />
            </div>
            <Button onClick={search} disabled={searching || !query.trim()} size="sm" className="gap-1">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {emptyNotes && results.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <StickyNote className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No notes yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add notes above; they will be embedded for semantic search.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {notes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Your notes</p>
                  <ul className="space-y-2">
                    {notes.map((n, i) => (
                      <Card key={i}>
                        <CardContent className="py-2 text-sm">{n}</CardContent>
                      </Card>
                    ))}
                  </ul>
                </div>
              )}
              {results.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Search results</p>
                  <div className="space-y-2">
                    {results.map((r) => (
                      <Card key={r.id}>
                        <CardContent className="py-3">
                          {r.score != null && <span className="text-xs text-muted-foreground">Relevance: {(r.score * 100).toFixed(0)}%</span>}
                          <p className="text-sm mt-1">{r.text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
