import { NextRequest, NextResponse } from 'next/server';
import { getTrip, getUploadDir, appendChunksToIndex, loadIndex, saveIndex } from '@/lib/trip-store';
import { createEmbeddings } from '@/lib/openai';
import { extractTextFromFile, chunkText } from '@/lib/extract-text';
import { MAX_FILE_SIZE_MB } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import { writeFile } from 'fs/promises';

const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const trip = await getTrip(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE_MB}MB)` }, { status: 400 });
  }

  const mime = file.type;
  const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'];
  if (!allowed.includes(mime)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, TXT, MD, CSV' }, { status: 400 });
  }

  try {
    const dir = await getUploadDir(tripId);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
    const filePath = path.join(dir, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const text = await extractTextFromFile(filePath, file.type);
    if (!text.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from file' }, { status: 400 });
    }

    const chunks = chunkText(text);
    const embeddings = await createEmbeddings(chunks);
    const fileId = `file-${Date.now()}-${safeName}`;
    const docChunks = chunks.map((t, i) => ({
      id: `${fileId}-chunk-${i}`,
      fileId,
      fileName: safeName,
      text: t,
      embedding: embeddings[i],
      page: undefined,
    }));

    await appendChunksToIndex(tripId, docChunks);

    return NextResponse.json({ filename: safeName, chunks: docChunks.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
