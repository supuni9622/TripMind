import { NextRequest, NextResponse } from 'next/server';
import { getTrip, loadIndex } from '@/lib/trip-store';
import { createEmbedding } from '@/lib/openai';
import { cosineSimilarity } from '@/lib/utils';

const MAX_QUERY_LEN = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const q = typeof body.query === 'string' ? body.query.trim().slice(0, MAX_QUERY_LEN) : '';

  const trip = await getTrip(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const index = await loadIndex(tripId);
  const noteChunks = index?.noteChunks ?? [];
  if (noteChunks.length === 0) return NextResponse.json({ results: [] });

  const queryEmbedding = await createEmbedding(q);
  const withScores = noteChunks
    .filter((n) => n.embedding && n.embedding.length === queryEmbedding.length)
    .map((n) => ({ ...n, score: cosineSimilarity(n.embedding!, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return NextResponse.json({
    results: withScores.map(({ id, text, score }) => ({ id, text, score })),
  });
}
