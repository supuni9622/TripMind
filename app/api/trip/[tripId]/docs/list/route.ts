import { NextRequest, NextResponse } from 'next/server';
import { getTrip, listUploads } from '@/lib/trip-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const trip = await getTrip(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const files = await listUploads(tripId);
  return NextResponse.json({ files });
}
