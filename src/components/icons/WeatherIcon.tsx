/**
 * WeatherIcon Component
 *
 * Displays official Met.no weather icons based on symbol code from API.
 * Icons are imported as SVG files and rendered inline for optimal performance.
 */

// Import all weather icon SVG files
// Using dynamic import with glob pattern for automatic bundling
const icons = import.meta.glob('@/assets/weather-icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default'
});

export interface WeatherIconProps {
  /** Weather symbol code from Met.no API (e.g., "clearsky_day", "rain", "snow") */
  symbol: string;
  /** Icon size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Weather icon component using official Met.no SVG icons
 * Falls back to cloud icon if symbol not found
 */
export function WeatherIcon({ symbol, size = 48, className = '' }: WeatherIconProps) {
  // Get the icon path
  const iconPath = `/src/assets/weather-icons/${symbol}.svg`;
  const iconSvg = icons[iconPath] as string | undefined;

  // Fallback to cloudy icon if symbol not found
  const fallbackPath = '/src/assets/weather-icons/cloudy.svg';
  const svg = iconSvg || (icons[fallbackPath] as string | undefined);

  if (!svg || typeof svg !== 'string') {
    // Ultimate fallback - empty div with background color
    return (
      <div
        style={{ width: size, height: size }}
        className={`inline-block bg-gray-400 rounded ${className}`}
        title={`Weather icon: ${symbol}`}
      />
    );
  }

  // Render SVG inline with proper sizing
  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
      title={`Weather: ${symbol}`}
    />
  );
}
