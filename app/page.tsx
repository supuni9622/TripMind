import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Map, Compass, FileText, Mic, Image } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
            <Compass className="h-7 w-7" />
            TripMind
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/trip/new">
              <Button>New trip</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 md:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Your AI travel companion
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Plan trips, research destinations, upload booking docs, and generate
            narrated travel guides — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/trip/new">
              <Button size="lg" className="gap-2">
                <Map className="h-5 w-5" />
                Start planning
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-24 grid max-w-4xl gap-8 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <FileText className="h-10 w-10 text-primary" />
            <h2 className="mt-3 font-semibold">Itinerary & docs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate day-by-day plans and upload PDFs or text files. Search by keyword and semantic embeddings.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <Compass className="h-10 w-10 text-primary" />
            <h2 className="mt-3 font-semibold">Discover & visualize</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Research destinations and create visual postcards for your itinerary places.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <Mic className="h-10 w-10 text-primary" />
            <h2 className="mt-3 font-semibold">Voice guides</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate narrated day guides as MP3 so you can listen on the go.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <Image className="h-10 w-10 text-primary" />
            <h2 className="mt-3 font-semibold">Export</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Export your trip as JSON and download all assets for offline use.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
