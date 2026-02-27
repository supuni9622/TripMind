'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Upload, Search } from 'lucide-react';

interface DocResult {
  id: string;
  fileName: string;
  text: string;
  page?: number;
}

export function DocumentsPanel({ tripId }: { tripId: string }) {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'keyword' | 'semantic' | 'both'>('both');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DocResult[]>([]);

  function loadList() {
    fetch(`/api/trip/${tripId}/docs/list`)
      .then((r) => r.json())
      .then((data) => setFiles(data.files || []));
  }

  useEffect(() => {
    loadList();
  }, [tripId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/trip/${tripId}/docs/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadList();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/trip/${tripId}/docs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  const empty = files.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 p-4 backdrop-blur">
        <h1 className="text-xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">Upload booking docs (PDF, TXT, MD, CSV). Search by keyword or semantic similarity.</p>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <label className="cursor-pointer">
            <input type="file" accept=".pdf,.txt,.md,.csv" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
              <span>
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Upload file'}
              </span>
            </Button>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[180px]">
            <Label htmlFor="doc-query">Search in documents</Label>
            <Input
              id="doc-query"
              placeholder="e.g. flight number, hotel address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="mt-1"
            />
          </div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'keyword' | 'semantic' | 'both')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
          >
            <option value="keyword">Keyword</option>
            <option value="semantic">Semantic</option>
            <option value="both">Both</option>
          </select>
          <Button onClick={search} disabled={searching || !query.trim()} size="sm" className="gap-1">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {empty ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No documents yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload PDF, TXT, MD, or CSV (max 10MB). We extract text and index for search.
                </p>
                <label className="mt-4">
                  <input type="file" accept=".pdf,.txt,.md,.csv" className="hidden" onChange={handleUpload} disabled={uploading} />
                  <Button type="button" asChild>
                    <span>{uploading ? 'Uploading…' : 'Upload file'}</span>
                  </Button>
                </label>
              </CardContent>
            </Card>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Uploaded files</p>
                <ul className="text-sm space-y-1">
                  {files.map((f) => (
                    <li key={f.name} className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </li>
                  ))}
                </ul>
              </div>
              {results.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Search results</p>
                  <div className="space-y-2">
                    {results.map((r) => (
                      <Card key={r.id}>
                        <CardContent className="py-3">
                          <p className="text-xs text-muted-foreground">{r.fileName}</p>
                          <p className="text-sm mt-1 line-clamp-3">{r.text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
