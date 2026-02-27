import { NextRequest, NextResponse } from 'next/server';
import { getTrip, saveTrip, withTripLock } from '@/lib/trip-store';
import { moderateInput, chat } from '@/lib/openai';
import type { TripDay, TripActivity } from '@/lib/types';

const MAX_INSTRUCTION_LEN = 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const instruction = typeof body.instruction === 'string' ? body.instruction.slice(0, MAX_INSTRUCTION_LEN) : '';

  try {
    const itinerary = await withTripLock(tripId, async () => {
      const trip = await getTrip(tripId);
      if (!trip) return null;

      const mod = await moderateInput(instruction || trip.destination);
      if (mod.flagged) return 'flagged';

      const currentItinerary = JSON.stringify(
        trip.itinerary.map((d) => ({ date: d.date, title: d.title, activities: d.activities }))
      );

      const raw = await chat([{ role: 'user', content: `You are a travel planner. Refine this itinerary based on the user's instruction.

Current itinerary (JSON):
${currentItinerary}

User instruction: ${instruction || 'Improve the itinerary to be more balanced and interesting.'}

Respond with ONLY a JSON array of days. Each element: { "date": "YYYY-MM-DD", "title": "Day N - ...", "activities": [ { "id": "string", "time": "09:00", "title": "...", "description": "...", "place": "...", "duration": "1h" } ] }. Preserve or generate activity ids. No other text.` }], { temperature: 0.5 });
      const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(cleaned) as { date: string; title?: string; activities: TripActivity[] }[];
      const newItinerary: TripDay[] = parsed.map((day) => ({
        date: day.date,
        title: day.title,
        activities: Array.isArray(day.activities) ? day.activities.map((a) => ({ ...a, id: a.id || `act-${Math.random().toString(36).slice(2, 9)}` })) : [],
        notes: trip.itinerary.find((d) => d.date === day.date)?.notes ?? '',
      }));

      trip.itinerary = newItinerary;
      trip.updatedAt = new Date().toISOString();
      await saveTrip(trip);
      return newItinerary;
    });

    if (itinerary === null) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    if (itinerary === 'flagged') return NextResponse.json({ error: 'Content flagged by moderation' }, { status: 400 });
    return NextResponse.json({ itinerary });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to refine itinerary' }, { status: 500 });
  }
}
