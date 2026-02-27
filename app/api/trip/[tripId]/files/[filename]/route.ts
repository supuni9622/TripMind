import { NextRequest, NextResponse } from 'next/server';
import { getTrip } from '@/lib/trip-store';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; filename: string }> }
) {
  const { tripId, filename } = await params;
  if (!tripId || !filename) return new NextResponse(null, { status: 400 });

  const trip = await getTrip(tripId);
  if (!trip) return new NextResponse(null, { status: 404 });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  if (safeName !== filename) return new NextResponse(null, { status: 400 });

  const filePath = path.join(UPLOADS_DIR, tripId, safeName);
  try {
    const buf = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const types: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.mp3': 'audio/mpeg',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };
    const contentType = types[ext] || 'application/octet-stream';
    return new NextResponse(buf, { headers: { 'Content-Type': contentType } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
