import { NextRequest, NextResponse } from 'next/server';
import { getTrip, saveTrip, loadIndex, updateNoteChunks, withTripLock } from '@/lib/trip-store';
import { moderateInput, createEmbedding } from '@/lib/openai';

const MAX_NOTE_LEN = 2000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_NOTE_LEN) : '';
  if (!text) return NextResponse.json({ error: 'Note text required' }, { status: 400 });

  const mod = await moderateInput(text);
  if (mod.flagged) return NextResponse.json({ error: 'Content flagged by moderation' }, { status: 400 });

  const notes = await withTripLock(tripId, async () => {
    const trip = await getTrip(tripId);
    if (!trip) return null;
    trip.notes = [...(trip.notes || []), text];
    trip.updatedAt = new Date().toISOString();
    await saveTrip(trip);
    const embedding = await createEmbedding(text);
    const index = await loadIndex(tripId);
    const noteChunks = [...(index?.noteChunks ?? []), { id: `note-${Date.now()}`, text, embedding }];
    await updateNoteChunks(tripId, noteChunks);
    return trip.notes;
  });

  if (notes === null) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  return NextResponse.json({ notes });
}
