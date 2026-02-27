import { NextRequest, NextResponse } from 'next/server';
import { getTrip, saveTrip, withTripLock } from '@/lib/trip-store';
import { moderateInput, generateImage } from '@/lib/openai';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
const MAX_PLACES = 5;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const place = typeof body.place === 'string' ? body.place.trim().slice(0, 200) : '';

  try {
    const result = await withTripLock(tripId, async () => {
      const trip = await getTrip(tripId);
      if (!trip) return null;

      const toModerate = place || trip.destination;
      const mod = await moderateInput(toModerate);
      if (mod.flagged) return 'flagged';

      const subject = place || trip.destination;
      const prompt = `A beautiful travel postcard-style image of ${subject}, scenic, professional photography, vibrant colors, suitable for a travel guide. No text in the image.`;

      const b64 = await generateImage(prompt);
      const dir = path.join(UPLOADS_DIR, tripId);
      await fs.mkdir(dir, { recursive: true });
      const slug = subject.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || 'image';
      const filename = `postcard-${slug}-${Date.now()}.png`;
      const filePath = path.join(dir, filename);
      await fs.writeFile(filePath, Buffer.from(b64, 'base64'));

      const tripData = trip as { images?: string[] };
      if (!tripData.images) tripData.images = [];
      tripData.images.push(filename);
      if (tripData.images.length > MAX_PLACES) tripData.images = tripData.images.slice(-MAX_PLACES);
      trip.updatedAt = new Date().toISOString();
      await saveTrip(trip);

      return { b64, filename };
    });

    if (result === null) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    if (result === 'flagged') return NextResponse.json({ error: 'Content flagged by moderation' }, { status: 400 });
    return NextResponse.json({ image: result.b64, filename: result.filename });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
