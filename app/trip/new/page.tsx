'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function NewTripPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preferences, setPreferences] = useState({ budget: '', pace: '', interests: '', dietary: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/trip/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destination.trim(),
          startDate: startDate.trim(),
          endDate: endDate.trim(),
          preferences: {
            budget: preferences.budget.trim() || undefined,
            pace: preferences.pace || undefined,
            interests: preferences.interests.split(',').map((s) => s.trim()).filter(Boolean),
            dietary: preferences.dietary.split(',').map((s) => s.trim()).filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create trip');
      router.push(`/trip/${data.tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold">New trip</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create your trip</CardTitle>
            <CardDescription>Destination and dates. Optional: budget, pace, interests.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder="e.g. Paris, France"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="budget">Budget (optional)</Label>
                <Input
                  id="budget"
                  placeholder="e.g. $200/day"
                  value={preferences.budget}
                  onChange={(e) => setPreferences((p) => ({ ...p, budget: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pace">Pace (optional)</Label>
                <select
                  id="pace"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={preferences.pace}
                  onChange={(e) => setPreferences((p) => ({ ...p, pace: e.target.value }))}
                >
                  <option value="">Any</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="moderate">Moderate</option>
                  <option value="packed">Packed</option>
                </select>
              </div>
              <div>
                <Label htmlFor="interests">Interests (optional, comma-separated)</Label>
                <Input
                  id="interests"
                  placeholder="e.g. art, food, history"
                  value={preferences.interests}
                  onChange={(e) => setPreferences((p) => ({ ...p, interests: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dietary">Dietary (optional, comma-separated)</Label>
                <Input
                  id="dietary"
                  placeholder="e.g. vegetarian, gluten-free"
                  value={preferences.dietary}
                  onChange={(e) => setPreferences((p) => ({ ...p, dietary: e.target.value }))}
                  className="mt-1"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating…' : 'Create trip'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
