# TripMind

**AI travel companion** — plan trips, research destinations, upload booking docs, and generate narrated travel guides.

- **Domain concept:** [tripmind.ai](https://tripmind.ai)
- **Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **AI:** OpenAI (server-side only via `/app/api/*`)
- **Persistence:** Local file storage under `./data` (no database in v1)

## Features

- **Create trip:** Destination, dates, preferences (budget, pace, interests, dietary)
- **Itinerary:** Generate and refine day-by-day plans with AI
- **Discover:** Research destinations (simulated web search via AI)
- **Visualize:** Generate visual postcards (DALL·E 3) for places
- **Voice guide:** TTS narrated day guides (MP3)
- **Documents:** Upload PDF/TXT/MD/CSV; keyword + semantic (embeddings) search
- **Notes:** Add notes; semantic search over notes
- **Export:** Download trip as JSON; assets in `data/uploads/{tripId}/`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy the example env and set your OpenAI key:

```bash
cp .env.example .env
```

Edit `.env`:

- `OPENAI_API_KEY` — required for all AI features
- `TRIP_TTL_DAYS` — optional; trips older than this are deleted by the cleanup job (default: 14)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Cleanup (optional)

To remove trips older than `TRIP_TTL_DAYS`:

```bash
npm run cleanup
```

Run via cron or manually.

## Local data layout (no DB)

All data is stored under `./data`:

```
data/
├── trips/           # Trip metadata and itinerary
│   └── {tripId}.json
├── uploads/         # Uploaded files per trip
│   └── {tripId}/
│       ├── *.pdf, *.txt, *.md, *.csv  (booking docs)
│       ├── postcard-*.png             (generated images)
│       └── voice-day-*.mp3            (generated audio)
└── index/           # Extracted text chunks + embeddings
    └── {tripId}.json
```

- **trips/{tripId}.json:** Trip object (destination, dates, preferences, itinerary, notes, images list).
- **uploads/{tripId}/:** All files for that trip (docs, images, audio). Served by `/api/trip/[tripId]/files/[filename]`.
- **index/{tripId}.json:** Chunks from uploaded docs and notes, with embeddings for semantic search.

## API routes

| Method | Route | Description |
|--------|--------|-------------|
| POST | `/api/trip/create` | Create trip |
| GET | `/api/trip/[tripId]` | Get trip |
| POST | `/api/trip/[tripId]/itinerary/generate` | Generate itinerary |
| POST | `/api/trip/[tripId]/itinerary/refine` | Refine itinerary |
| POST | `/api/trip/[tripId]/discover/search` | Discover / research |
| POST | `/api/trip/[tripId]/visualize` | Generate postcard image |
| POST | `/api/trip/[tripId]/voice` | Generate day voice guide (MP3) |
| POST | `/api/trip/[tripId]/docs/upload` | Upload doc (multipart) |
| GET | `/api/trip/[tripId]/docs/list` | List uploaded docs |
| POST | `/api/trip/[tripId]/docs/search` | Keyword + embeddings search |
| POST | `/api/trip/[tripId]/notes` | Add note (with embedding) |
| POST | `/api/trip/[tripId]/notes/search` | Semantic search notes |
| GET | `/api/trip/[tripId]/export` | Export trip JSON |
| GET | `/api/trip/[tripId]/files/[filename]` | Serve uploaded file |

## Safety and limits

- **Moderation:** User free-text inputs are run through OpenAI Moderation before use.
- **File upload:** Max 10MB per file; allowed types: PDF, TXT, MD, CSV.
- **Input lengths:** Destination, queries, and instructions are truncated to safe limits.

## Docker

```bash
docker build -t tripmind .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-... -e TRIP_TTL_DAYS=14 tripmind
```

Data is written under `/app/data` in the container; mount a volume if you want to persist it.

## License

MIT
