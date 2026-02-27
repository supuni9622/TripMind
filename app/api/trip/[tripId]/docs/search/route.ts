import { NextRequest, NextResponse } from 'next/server';
import { getTrip, loadIndex } from '@/lib/trip-store';
import { createEmbedding } from '@/lib/openai';
import { cosineSimilarity } from '@/lib/utils';
import type { DocChunk } from '@/lib/types';

const MAX_QUERY_LEN = 500;
const MAX_KEYWORD_MATCHES = 20;
const MAX_SEMANTIC_MATCHES = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const q = typeof body.query === 'string' ? body.query.trim().slice(0, MAX_QUERY_LEN) : '';
  const mode: 'keyword' | 'semantic' | 'both' = body.mode === 'semantic' ? 'semantic' : body.mode === 'both' ? 'both' : 'keyword';

  const trip = await getTrip(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const index = await loadIndex(tripId);
  const allChunks: DocChunk[] = [...(index?.chunks ?? [])];

  const keywordMatches: DocChunk[] = [];
  if (mode === 'keyword' || mode === 'both') {
    const lower = q.toLowerCase();
    const terms = lower.split(/\s+/).filter(Boolean);
    for (const chunk of allChunks) {
      const score = terms.filter((t: string) => chunk.text.toLowerCase().includes(t)).length;
      if (score > 0) keywordMatches.push(chunk);
    }
    keywordMatches.sort((a, b) => {
      const sa = terms.filter((t: string) => a.text.toLowerCase().includes(t)).length;
      const sb = terms.filter((t: string) => b.text.toLowerCase().includes(t)).length;
      return sb - sa;
    });
  }

  let semanticMatches: { chunk: DocChunk; score: number }[] = [];
  if ((mode === 'semantic' || mode === 'both') && q && allChunks.some((c) => c.embedding?.length)) {
    const queryEmbedding = await createEmbedding(q);
    const withEmbedding = allChunks.filter((c) => c.embedding && c.embedding.length === queryEmbedding.length);
    semanticMatches = withEmbedding
      .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.embedding!, queryEmbedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SEMANTIC_MATCHES);
  }

  const combined =
    mode === 'both'
      ? [...semanticMatches.map((m) => m.chunk), ...keywordMatches.filter((k) => !semanticMatches.some((s) => s.chunk.id === k.id))].slice(0, 15)
      : mode === 'semantic'
        ? semanticMatches.map((m) => m.chunk)
        : keywordMatches.slice(0, MAX_KEYWORD_MATCHES);

  return NextResponse.json({
    results: combined.map((c) => ({ id: c.id, fileName: c.fileName, text: c.text, page: c.page })),
  });
}
