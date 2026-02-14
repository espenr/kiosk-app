import { ReactNode } from 'react';

interface DashboardLayoutProps {
  header: ReactNode;
  photoSlideshow: ReactNode;
  calendar: ReactNode;
  electricity: ReactNode;
  transport: ReactNode;
}

/**
 * Fixed layout for 32" TV in portrait orientation (1080x1920)
 *
 * Layout:
 * - Header: 10% (clock, date, weather)
 * - Photo + Calendar: 50% (slideshow with calendar overlay)
 * - Electricity: 25% (current price + chart)
 * - Transport: 15% (bus departures)
 */
export function DashboardLayout({
  header,
  photoSlideshow,
  calendar,
  electricity,
  transport,
}: DashboardLayoutProps) {
  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header - 10% */}
      <header className="h-[10%] flex-shrink-0 border-b border-gray-800">
        {header}
      </header>

      {/* Photo + Calendar overlay - 50% */}
      <section className="h-[50%] flex-shrink-0 relative">
        {/* Photo slideshow - full area */}
        <div className="absolute inset-0 z-10">
          {photoSlideshow}
        </div>
        {/* Calendar overlay - bottom portion */}
        <div className="absolute bottom-0 left-0 right-0 h-2/5 z-20 bg-black/70 backdrop-blur-sm">
          {calendar}
        </div>
      </section>

      {/* Electricity - 25% */}
      <section className="h-[25%] flex-shrink-0 border-t border-gray-800">
        {electricity}
      </section>

      {/* Transport - 15% */}
      <section className="h-[15%] flex-shrink-0 border-t border-gray-800">
        {transport}
      </section>
    </div>
  );
}
