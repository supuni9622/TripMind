'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Calendar, Compass, Image, Mic, FileText, Search, Download } from 'lucide-react';

const nav = [
  { href: 'itinerary', label: 'Itinerary', icon: Calendar },
  { href: 'discover', label: 'Discover', icon: Compass },
  { href: 'visualize', label: 'Visualize', icon: Image },
  { href: 'voice', label: 'Voice Guide', icon: Mic },
  { href: 'documents', label: 'Documents', icon: FileText },
  { href: 'notes', label: 'Notes Search', icon: Search },
];

export function TripSidebar({ tripId }: { tripId?: string }) {
  const pathname = usePathname();
  const id = tripId || (pathname?.match(/\/trip\/([^/]+)/)?.[1] ?? '');

  if (!id) return null;

  const base = `/trip/${id}`;
  const isActive = (href: string) => pathname === `${base}/${href}` || (href === 'itinerary' && pathname === base);

  return (
    <aside className="flex w-full flex-col border-r bg-card md:w-56 shrink-0">
      <div className="sticky top-0 flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="font-semibold text-primary">
          TripMind
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href === 'itinerary' ? base : `${base}/${href}`}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              isActive(href) ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
        <Link
          href={`${base}/export`}
          className={cn(
            'mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
            pathname === `${base}/export` ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Download className="h-4 w-4 shrink-0" />
          Export
        </Link>
      </nav>
    </aside>
  );
}
