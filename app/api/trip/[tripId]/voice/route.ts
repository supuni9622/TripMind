import { NextRequest, NextResponse } from 'next/server';
import { getTrip } from '@/lib/trip-store';
import { moderateInput, textToSpeech } from '@/lib/openai';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const dayIndex = typeof body.dayIndex === 'number' ? body.dayIndex : 0;

  const trip = await getTrip(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const day = trip.itinerary[dayIndex];
  if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 });

  const textParts = [
    day.title ? `${day.title}. ` : `Day ${dayIndex + 1}. `,
    ...day.activities.map((a) => `${a.time || ''} ${a.title}. ${a.description || ''} ${a.place ? `At ${a.place}.` : ''}`.trim()),
  ];
  const script = textParts.join(' ').slice(0, 4000);

  const mod = await moderateInput(script);
  if (mod.flagged) return NextResponse.json({ error: 'Content flagged by moderation' }, { status: 400 });

  try {
    const mp3Buffer = await textToSpeech(script);
    const dir = path.join(UPLOADS_DIR, tripId);
    await fs.mkdir(dir, { recursive: true });
    const filename = `voice-day-${dayIndex + 1}-${Date.now()}.mp3`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, mp3Buffer);

    return NextResponse.json({ filename, size: mp3Buffer.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 500 });
  }
}
