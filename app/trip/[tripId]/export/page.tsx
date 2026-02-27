'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';

export default function ExportPage() {
  const params = useParams();
  const tripId = params?.tripId as string | undefined;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    fetch(`/api/trip/${tripId}/export`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [tripId]);

  function downloadJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tripmind-${tripId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <p className="text-muted-foreground">Loading export…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <p className="text-destructive">Trip not found or export failed.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Export trip</CardTitle>
          <CardDescription>
            Download your trip data as JSON. Includes metadata, itinerary, notes, and file list. Uploaded assets (docs, images, audio) are stored under data/uploads and can be copied manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={downloadJson} className="gap-2">
            <Download className="h-4 w-4" />
            Download JSON
          </Button>
          <p className="text-sm text-muted-foreground">
            File list and index summary are included. To get actual files (PDFs, images, MP3s), copy the folder <code className="rounded bg-muted px-1">data/uploads/{tripId}</code> from the server.
          </p>
          <Link href={`/trip/${tripId}`}>
            <Button variant="outline">Back to trip</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
