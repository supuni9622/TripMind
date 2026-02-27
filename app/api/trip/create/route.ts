import { NextRequest, NextResponse } from 'next/server';
import { getTrip, saveTrip } from '@/lib/trip-store';
import type { Trip, TripPreferences } from '@/lib/types';
import { moderateInput } from '@/lib/openai';
import { ensureDataDirs } from '@/lib/trip-store';
import crypto from 'crypto';

const MAX_DESTINATION_LEN = 200;
const MAX_INTERESTS = 20;
const MAX_INTEREST_LEN = 50;

function validatePreferences(pref: unknown): TripPreferences {
  const p = (pref && typeof pref === 'object' ? pref : {}) as Record<string, unknown>;
  return {
    budget: typeof p.budget === 'string' ? p.budget.slice(0, 100) : undefined,
    pace: ['relaxed', 'moderate', 'packed'].includes(p.pace as string) ? (p.pace as TripPreferences['pace']) : undefined,
    interests: Array.isArray(p.interests) ? p.interests.slice(0, MAX_INTERESTS).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, MAX_INTEREST_LEN)) : undefined,
    dietary: Array.isArray(p.dietary) ? p.dietary.slice(0, 10).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 50)) : undefined,
    accessibility: Array.isArray(p.accessibility) ? p.accessibility.slice(0, 10).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 50)) : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const destination = typeof body.destination === 'string' ? body.destination.trim().slice(0, MAX_DESTINATION_LEN) : '';
    const startDate = typeof body.startDate === 'string' ? body.startDate : '';
    const endDate = typeof body.endDate === 'string' ? body.endDate : '';

    if (!destination || !startDate || !endDate) {
      return NextResponse.json({ error: 'destination, startDate, and endDate are required' }, { status: 400 });
    }

    const toModerate = [destination].join(' ');
    const mod = await moderateInput(toModerate);
    if (mod.flagged) {
      return NextResponse.json({ error: 'Content was flagged by moderation' }, { status: 400 });
    }

    await ensureDataDirs();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const preferences = validatePreferences(body.preferences);

    const trip: Trip = {
      id,
      destination,
      startDate,
      endDate,
      preferences,
      itinerary: [],
      notes: [],
      createdAt: now,
      updatedAt: now,
    };

    await saveTrip(trip);
    return NextResponse.json({ tripId: id, trip });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }
}
