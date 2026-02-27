import { TripSidebar } from '@/components/trip-sidebar';

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <TripSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
