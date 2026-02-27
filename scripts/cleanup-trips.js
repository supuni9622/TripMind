#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const TRIPS_DIR = path.join(DATA_DIR, 'trips');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const INDEX_DIR = path.join(DATA_DIR, 'index');

const ttlDays = parseInt(process.env.TRIP_TTL_DAYS || '14', 10);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function listTripIds() {
  ensureDir(TRIPS_DIR);
  const entries = fs.readdirSync(TRIPS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name.replace(/\.json$/, ''));
}

function getTrip(tripId) {
  const filePath = path.join(TRIPS_DIR, `${tripId}.json`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function deleteTrip(tripId) {
  const tripPath = path.join(TRIPS_DIR, `${tripId}.json`);
  const uploadPath = path.join(UPLOADS_DIR, tripId);
  const indexPath = path.join(INDEX_DIR, `${tripId}.json`);
  if (fs.existsSync(tripPath)) fs.unlinkSync(tripPath);
  if (fs.existsSync(uploadPath)) fs.rmSync(uploadPath, { recursive: true });
  if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
}

const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
const ids = listTripIds();
let deleted = 0;
for (const id of ids) {
  const trip = getTrip(id);
  if (trip && new Date(trip.updatedAt).getTime() < cutoff) {
    deleteTrip(id);
    deleted++;
  }
}
console.log(`Cleanup: deleted ${deleted} trip(s) older than ${ttlDays} days.`);
