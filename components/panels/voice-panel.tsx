'use client';

import { useState, useRef } from 'react';
import type { Trip } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic } from 'lucide-react';

export function VoicePanel({ trip }: { trip: Trip }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const days = trip.itinerary || [];
  const hasDays = days.length > 0;

  async function generate() {
    setLoading(true);
    setCurrentFile(null);
    try {
      const res = await fetch(`/api/trip/${trip.id}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentFile(data.filename);
      setTimeout(() => {
        const url = `/api/trip/${trip.id}/files/${encodeURIComponent(data.filename)}`;
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        }
      }, 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 p-4 backdrop-blur">
        <h1 className="text-xl font-semibold">Voice Guide</h1>
        <p className="text-sm text-muted-foreground">Generate a narrated day guide (MP3) for your itinerary.</p>
        {hasDays && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <label className="text-sm">Day</label>
            <select
              value={dayIndex}
              onChange={(e) => setDayIndex(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {days.map((d, i) => (
                <option key={d.date} value={i}>
                  {d.title || `Day ${i + 1}`} · {d.date}
                </option>
              ))}
            </select>
            <Button onClick={generate} disabled={loading} className="gap-1">
              <Mic className="h-4 w-4" />
              {loading ? 'Generating…' : 'Generate voice guide'}
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!hasDays ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Mic className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No itinerary days</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate an itinerary first, then come back to create a narrated day guide.
                </p>
              </CardContent>
            </Card>
          ) : currentFile ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-2">Day {dayIndex + 1} guide</p>
                <audio
                  ref={audioRef}
                  controls
                  className="w-full"
                  src={`/api/trip/${trip.id}/files/${encodeURIComponent(currentFile)}`}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Mic className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No audio yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a day and click Generate to create an MP3 narration.
                </p>
                <Button onClick={generate} disabled={loading} className="mt-4">
                  {loading ? 'Generating…' : 'Generate voice guide'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
