import { ReactNode } from 'react';
import { WidgetPosition } from '../../contexts/LayoutContext';

interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  config: WidgetPosition;
}

export default function GridItem({ children, config, className = '', ...props }: GridItemProps) {
  const { x, y, width, height, visible } = config;

  if (!visible) return null;

  return (
    <div
      className={`relative bg-white/10 rounded-md p-2 overflow-hidden ${className}`}
      style={{
        gridColumnStart: x + 1,
        gridColumnEnd: x + width + 1,
        gridRowStart: y + 1,
        gridRowEnd: y + height + 1,
      }}
      {...props}
    >
      {children}
    </div>
  );
}