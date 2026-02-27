'use client';

import React, { useState } from 'react';
import type { Trip, TripDay } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, RefreshCw } from 'lucide-react';

export function ItineraryPanel({ trip, onUpdate }: { trip: Trip; onUpdate: (t: Trip) => void }) {
  const [refineInstruction, setRefineInstruction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/trip/${trip.id}/itinerary/generate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...trip, itinerary: data.itinerary });
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  async function refine() {
    setRefining(true);
    try {
      const res = await fetch(`/api/trip/${trip.id}/itinerary/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: refineInstruction || 'Make the itinerary more balanced and interesting.' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...trip, itinerary: data.itinerary });
      setRefineInstruction('');
    } catch (e) {
      console.error(e);
    } finally {
      setRefining(false);
    }
  }

  const empty = !(trip.itinerary && trip.itinerary.length);

  const header = (
    <div className="border-b bg-background p-4 backdrop-blur">
      <h1 className="text-xl font-semibold">{trip.destination}</h1>
      <p className="text-sm text-muted-foreground">
        {trip.startDate} → {trip.endDate}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={generate} disabled={generating} size="sm" className="gap-1">
          <Sparkles className="h-4 w-4" />
          {generating ? 'Generating…' : 'Generate itinerary'}
        </Button>
        {!empty && (
          <>
            <Textarea
              placeholder="Refine: e.g. add more museums, less walking"
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value)}
              className="min-h-[60px] w-full max-w-md resize-none text-sm"
            />
            <Button onClick={refine} disabled={refining} variant="outline" size="sm" className="gap-1">
              <RefreshCw className="h-4 w-4" />
              {refining ? 'Refining…' : 'Refine'}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const body = empty ? (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 font-medium">No itinerary yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a day-by-day plan with activities and times.
        </p>
        <Button onClick={generate} disabled={generating} className="mt-4">
          {generating ? 'Generating…' : 'Generate itinerary'}
        </Button>
      </CardContent>
    </Card>
  ) : (
    <>
      {trip.itinerary.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activities per day</CardTitle>
          </CardHeader>
          <CardContent className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trip.itinerary.map((d, i) => ({ day: d.title || `Day ${i + 1}`, count: d.activities?.length ?? 0 }))}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {trip.itinerary.map((day: TripDay, i: number) => (
        <Card key={day.date}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {day.title || `Day ${i + 1}`} · {day.date}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.activities.map((act) => (
              <div key={act.id} className="flex gap-3 rounded-lg border-l-2 border-primary/50 bg-muted/30 pl-3 py-2">
                <span className="text-sm font-medium text-muted-foreground shrink-0 w-14">{act.time || '—'}</span>
                <div>
                  <p className="font-medium">{act.title}</p>
                  {act.place && <p className="text-sm text-muted-foreground">{act.place}</p>}
                  {act.description && <p className="text-sm mt-1">{act.description}</p>}
                  {act.duration && <span className="text-xs text-muted-foreground">{act.duration}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );

  const content = (
    <div className="flex flex-col h-full">
      {header}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {body}
        </div>
      </ScrollArea>
    </div>
  );
  return content;
}
