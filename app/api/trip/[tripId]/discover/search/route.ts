import { NextRequest, NextResponse } from 'next/server';
import { getTrip, saveTrip, withTripLock } from '@/lib/trip-store';
import { moderateInput, chat } from '@/lib/openai';
import type { DiscoverResult } from '@/lib/types';

const MAX_QUERY_LEN = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === 'string' ? body.query.trim().slice(0, MAX_QUERY_LEN) : '';
  const updateItinerary = body.updateItinerary === true;

  try {
    const results = await withTripLock(tripId, async () => {
      const trip = await getTrip(tripId);
      if (!trip) return null;

      const toModerate = query || trip.destination;
      const mod = await moderateInput(toModerate);
      if (mod.flagged) return 'flagged';

      const searchPrompt = query
        ? `Research "${query}" in the context of a trip to ${trip.destination} (${trip.startDate} to ${trip.endDate}). Provide 5-8 concise findings as if from web search results.`
        : `Research ${trip.destination} for a trip from ${trip.startDate} to ${trip.endDate}. Provide 5-8 key travel tips, attractions, and practical info as search-style results.`;

      const raw = await chat(
        [{ role: 'user', content: `${searchPrompt} Respond with a JSON array only. Each item: { "title": "...", "snippet": "...", "url": "optional-url" }. No markdown.` }],
        { temperature: 0.5 }
      );
      const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '').trim();
      const parsedResults = JSON.parse(cleaned) as DiscoverResult[];

      if (updateItinerary && Array.isArray(parsedResults) && parsedResults.length > 0 && trip.itinerary.length > 0) {
        const summary = parsedResults.slice(0, 5).map((r) => r.title + ': ' + r.snippet).join('\n');
        const refinePrompt = `Based on these research findings, suggest one small improvement to the itinerary. Findings:\n${summary}\n\nCurrent itinerary (first day only): ${JSON.stringify(trip.itinerary[0])}. Respond with a single sentence suggestion only.`;
        const suggestion = await chat([{ role: 'user', content: refinePrompt }], { max_tokens: 150 });
        trip.notes = [...(trip.notes || []), `Discover: ${suggestion}`];
        trip.updatedAt = new Date().toISOString();
        await saveTrip(trip);
      }

      return Array.isArray(parsedResults) ? parsedResults : [];
    });

    if (results === null) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    if (results === 'flagged') return NextResponse.json({ error: 'Content flagged by moderation' }, { status: 400 });
    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Discover search failed' }, { status: 500 });
  }
}
