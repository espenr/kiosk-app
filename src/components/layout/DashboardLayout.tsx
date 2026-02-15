import { ReactNode } from 'react';

interface DashboardLayoutProps {
  header: ReactNode;
  photoSlideshow: ReactNode;
  calendar: ReactNode;
  electricity: ReactNode;
  transport: ReactNode;
}

/**
 * Fixed layout for 32" TV in portrait orientation (768x1125)
 * Based on Balsamiq wireframe design
 *
 * Layout:
 * - Header: 8% (clock, date, weather)
 * - Photo + Calendar: 70% (slideshow with calendar overlay at bottom)
 * - Electricity: 12% (simple current + forecast text)
 * - Transport: 10% (single next bus line)
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

      {/* Photo + Calendar overlay - 72% */}
      <section className="h-[72%] flex-shrink-0 relative">
        {/* Photo slideshow - full area */}
        <div className="absolute inset-0 z-10">
          {photoSlideshow}
        </div>
        {/* Calendar overlay - transparent to show photo behind */}
        <div className="absolute bottom-0 left-0 right-0 h-[55%] z-20">
          {calendar}
        </div>
      </section>

      {/* Electricity - 8% */}
      <section className="h-[8%] flex-shrink-0 border-t border-gray-800">
        {electricity}
      </section>

      {/* Transport - 10% */}
      <section className="h-[10%] flex-shrink-0 border-t border-gray-800">
        {transport}
      </section>
    </div>
  );
}
