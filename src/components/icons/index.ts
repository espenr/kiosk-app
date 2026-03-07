/**
 * Icon Components
 *
 * Barrel export for all icon components and Lucide icons used in the app.
 */

// Custom icon components
export { WeatherIcon } from './WeatherIcon';
export { WindArrow } from './WindArrow';
export type { WeatherIconProps } from './WeatherIcon';
export type { WindArrowProps, WindDirection } from './WindArrow';

// Lucide UI icons (only export what we use to enable tree-shaking)
export {
  Sun,
  Moon,
  Circle,
  AlertTriangle,
} from 'lucide-react';
