import { NextRequest, NextResponse } from 'next/server';
import { getTrip, saveTrip, withTripLock } from '@/lib/trip-store';
import { moderateInput, chat } from '@/lib/openai';
import type { TripDay, TripActivity } from '@/lib/types';

const MAX_PREF_LEN = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  let result: { error: 'not_found' | 'flagged' | null; itinerary: TripDay[] | null };
  try {
    result = await withTripLock(tripId, async () => {
    const trip = await getTrip(tripId);
    if (!trip) return { error: 'not_found' as const, itinerary: null };

    const prefStr = [
    trip.preferences.budget && `Budget: ${trip.preferences.budget}`,
    trip.preferences.pace && `Pace: ${trip.preferences.pace}`,
    trip.preferences.interests?.length && `Interests: ${trip.preferences.interests.join(', ')}`,
    trip.preferences.dietary?.length && `Dietary: ${trip.preferences.dietary.join(', ')}`,
  ]
    .filter(Boolean)
    .join('. ')
    .slice(0, MAX_PREF_LEN);

    const toModerate = `${trip.destination} ${prefStr}`;
    const mod = await moderateInput(toModerate);
    if (mod.flagged) return { error: 'flagged' as const, itinerary: null };

    const prompt = `You are a travel planner. Create a day-by-day itinerary for a trip to ${trip.destination} from ${trip.startDate} to ${trip.endDate}.
${prefStr ? `Preferences: ${prefStr}` : ''}

Respond with exactly one JSON object of this shape (no other text):
{ "itinerary": [ { "date": "YYYY-MM-DD", "title": "Day N - ...", "activities": [ { "id": "short-id", "time": "09:00", "title": "...", "description": "...", "place": "...", "duration": "1h" } ] } ] }

Rules: 3-6 activities per day. Use exact date format YYYY-MM-DD. Keep all string values short. Escape quotes inside strings (use \\"). No newlines inside string values.`;

    try {
      const raw = await chat([{ role: 'user', content: prompt }], {
      temperature: 0.5,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });
    if (!raw || typeof raw !== 'string') {
      throw new Error('Empty or invalid response from model. Please try again.');
    }
    let cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/g, '')
      .trim();
    const cleanedOneLine = cleaned.replace(/\n/g, ' ').replace(/\r/g, ' ');
    let parsed: { date: string; title?: string; activities: TripActivity[] }[] = [];

    const tryParse = (str: string): { itinerary?: { date: string; title?: string; activities: TripActivity[] }[] } | null => {
      try {
        return JSON.parse(str) as { itinerary?: { date: string; title?: string; activities: TripActivity[] }[] };
      } catch {
        return null;
      }
    };

    let wrapper = tryParse(cleaned) ?? tryParse(cleanedOneLine);
    if (wrapper) {
      parsed = Array.isArray(wrapper.itinerary) ? wrapper.itinerary : [];
    }
    if (parsed.length === 0) {
      const extractFirstObject = (s: string): string | null => {
        const i = s.indexOf('{');
        if (i === -1) return null;
        let depth = 0;
        let inString = false;
        let escape = false;
        let quote = '';
        for (let j = i; j < s.length; j++) {
          const c = s[j];
          if (escape) {
            escape = false;
            continue;
          }
          if (inString) {
            if (c === quote) inString = false;
            else if (c === '\\') escape = true;
            continue;
          }
          if (c === '"' || c === "'") {
            inString = true;
            quote = c;
            continue;
          }
          if (c === '{') depth++;
          else if (c === '}') {
            depth--;
            if (depth === 0) return s.slice(i, j + 1);
          }
        }
        return null;
      };
      const extractFirstArray = (s: string): string | null => {
        const i = s.indexOf('[');
        if (i === -1) return null;
        let depth = 0;
        let inString = false;
        let escape = false;
        let quote = '';
        for (let j = i; j < s.length; j++) {
          const c = s[j];
          if (escape) {
            escape = false;
            continue;
          }
          if (inString) {
            if (c === quote) inString = false;
            else if (c === '\\') escape = true;
            continue;
          }
          if (c === '"' || c === "'") {
            inString = true;
            quote = c;
            continue;
          }
          if (c === '[' || c === '{') depth++;
          else if (c === ']' || c === '}') {
            depth--;
            if (depth === 0) return s.slice(i, j + 1);
          }
        }
        return null;
      };
      const objStr = extractFirstObject(cleanedOneLine);
      if (objStr) {
        wrapper = tryParse(objStr);
        if (wrapper) parsed = Array.isArray(wrapper.itinerary) ? wrapper.itinerary : [];
      }
      if (parsed.length === 0) {
        const arrStr = extractFirstArray(cleanedOneLine);
        if (arrStr) {
          try {
            const arr = JSON.parse(arrStr) as { date: string; title?: string; activities: TripActivity[] }[];
            if (Array.isArray(arr)) parsed = arr;
          } catch {
            // ignore
          }
        }
      }
    }
    if (parsed.length === 0) {
      console.error('Itinerary parse failed. Raw length:', raw.length, 'First 200 chars:', raw.slice(0, 200));
      throw new Error('Invalid JSON from model. Please try generating again.');
    }
    const itinerary: TripDay[] = parsed.map((day) => ({
      date: day.date,
      title: day.title,
      activities: Array.isArray(day.activities) ? day.activities.map((a) => ({ ...a, id: a.id || `act-${Math.random().toString(36).slice(2, 9)}` })) : [],
      notes: '',
    }));

    trip.itinerary = itinerary;
    trip.updatedAt = new Date().toISOString();
    await saveTrip(trip);
      return { error: null, itinerary };
    } catch (e) {
      console.error(e);
      throw e;
    }
  });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate itinerary' }, { status: 500 });
  }

  if (result.error === 'not_found') return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (result.error === 'flagged') return NextResponse.json({ error: 'Content flagged by moderation' }, { status: 400 });
  if (result.error || !result.itinerary) return NextResponse.json({ error: 'Failed to generate itinerary' }, { status: 500 });
  return NextResponse.json({ itinerary: result.itinerary });
}
