/**
 * WindArrow Component
 *
 * Displays wind direction using Lucide arrow icons.
 * Arrow points TO where wind is blowing (opposite of FROM direction).
 */
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
} from 'lucide-react';

export type WindDirection =
  | 'down'
  | 'down-left'
  | 'left'
  | 'up-left'
  | 'up'
  | 'up-right'
  | 'right'
  | 'down-right';

export interface WindArrowProps {
  /** Wind direction (arrow points TO where wind is blowing) */
  direction: WindDirection;
  /** Icon size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Wind direction arrow using Lucide icons
 */
export function WindArrow({ direction, size = 20, className = '' }: WindArrowProps) {
  const iconProps = { size, className };

  switch (direction) {
    case 'down':
      return <ArrowDown {...iconProps} />;
    case 'down-left':
      return <ArrowDownLeft {...iconProps} />;
    case 'left':
      return <ArrowLeft {...iconProps} />;
    case 'up-left':
      return <ArrowUpLeft {...iconProps} />;
    case 'up':
      return <ArrowUp {...iconProps} />;
    case 'up-right':
      return <ArrowUpRight {...iconProps} />;
    case 'right':
      return <ArrowRight {...iconProps} />;
    case 'down-right':
      return <ArrowDownRight {...iconProps} />;
    default:
      return <ArrowDown {...iconProps} />;
  }
}
