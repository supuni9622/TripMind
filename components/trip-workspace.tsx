'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Trip } from '@/lib/types';
import { ItineraryPanel } from '@/components/panels/itinerary-panel';
import { DiscoverPanel } from '@/components/panels/discover-panel';
import { VisualizePanel } from '@/components/panels/visualize-panel';
import { VoicePanel } from '@/components/panels/voice-panel';
import { DocumentsPanel } from '@/components/panels/documents-panel';
import { NotesPanel } from '@/components/panels/notes-panel';

type Panel = 'itinerary' | 'discover' | 'visualize' | 'voice' | 'documents' | 'notes';

export function TripWorkspace({ panel }: { panel: Panel }) {
  const params = useParams();
  const tripId = params?.tripId as string | undefined;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    fetch(`/api/trip/${tripId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setTrip(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tripId]);

  if (!tripId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-destructive">Invalid trip.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-muted-foreground">Loading trip…</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-destructive">Trip not found.</p>
      </div>
    );
  }

  switch (panel) {
    case 'itinerary':
      return <ItineraryPanel trip={trip} onUpdate={setTrip} />;
    case 'discover':
      return <DiscoverPanel trip={trip} />;
    case 'visualize':
      return <VisualizePanel trip={trip} onUpdate={setTrip} />;
    case 'voice':
      return <VoicePanel trip={trip} />;
    case 'documents':
      return <DocumentsPanel tripId={tripId} />;
    case 'notes':
      return <NotesPanel tripId={tripId} trip={trip} onUpdate={setTrip} />;
    default:
      return <ItineraryPanel trip={trip} onUpdate={setTrip} />;
  }
}
