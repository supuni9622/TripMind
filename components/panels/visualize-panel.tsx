'use client';

import { useState } from 'react';
import type { Trip } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image as ImageIcon } from 'lucide-react';

export function VisualizePanel({ trip, onUpdate }: { trip: Trip; onUpdate: (t: Trip) => void }) {
  const [place, setPlace] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trip/${trip.id}/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: place.trim() || trip.destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...trip, images: [...(trip.images || []), data.filename] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const images = trip.images || [];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 p-4 backdrop-blur">
        <h1 className="text-xl font-semibold">Visualize</h1>
        <p className="text-sm text-muted-foreground">Generate visual postcards for places in your trip.</p>
        <div className="mt-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="visualize-place">Place</Label>
            <Input
              id="visualize-place"
              placeholder={trip.destination}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={generate} disabled={loading} className="gap-1">
            <ImageIcon className="h-4 w-4" />
            {loading ? 'Generating…' : 'Generate postcard'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {images.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {images.map((filename) => (
                <Card key={filename}>
                  <CardContent className="p-0">
                    <img
                      src={`/api/trip/${trip.id}/files/${encodeURIComponent(filename)}`}
                      alt={filename}
                      className="w-full rounded-lg object-cover"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No images yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generate a postcard for a place (e.g. {trip.destination} or a specific spot).
                </p>
                <Button onClick={generate} disabled={loading} className="mt-4">
                  {loading ? 'Generating…' : 'Generate postcard'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
