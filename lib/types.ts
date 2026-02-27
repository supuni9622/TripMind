export interface TripPreferences {
  budget?: string;
  pace?: 'relaxed' | 'moderate' | 'packed';
  interests?: string[];
  dietary?: string[];
  accessibility?: string[];
}

export interface TripDay {
  date: string;
  title?: string;
  activities: TripActivity[];
  notes?: string;
}

export interface TripActivity {
  id: string;
  time?: string;
  title: string;
  description?: string;
  place?: string;
  duration?: string;
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  preferences: TripPreferences;
  itinerary: TripDay[];
  notes: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocChunk {
  id: string;
  fileId: string;
  fileName: string;
  text: string;
  embedding?: number[];
  page?: number;
}

export interface IndexEntry {
  tripId: string;
  chunks: DocChunk[];
  noteChunks?: { id: string; text: string; embedding?: number[] }[];
}

export interface DiscoverResult {
  title: string;
  snippet: string;
  url?: string;
}

export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_DOC_TYPES = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'];
