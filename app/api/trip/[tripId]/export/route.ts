import { NextRequest, NextResponse } from 'next/server';
import { getTrip, listUploads, loadIndex } from '@/lib/trip-store';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const trip = await getTrip(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const files = await listUploads(tripId);
  const index = await loadIndex(tripId);

  const exportData = {
    trip: {
      id: trip.id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      preferences: trip.preferences,
      itinerary: trip.itinerary,
      notes: trip.notes,
      images: trip.images,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    },
    files: files.map((f) => ({ name: f.name, size: f.size })),
    indexSummary: index
      ? {
          chunkCount: index.chunks?.length ?? 0,
          noteChunkCount: index.noteChunks?.length ?? 0,
        }
      : null,
    exportedAt: new Date().toISOString(),
  };

  return NextResponse.json(exportData);
}
