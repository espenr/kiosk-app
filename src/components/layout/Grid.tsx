import { ReactNode } from 'react';
import { useLayout } from '../../contexts/LayoutContext';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Grid({ children, className = '', ...props }: GridProps) {
  const { layoutConfig } = useLayout();
  const { columns, rows } = layoutConfig.grid;

  return (
    <div
      className={`w-full h-full relative grid gap-[2px] ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
      {...props}
    >
      {children}
    </div>
  );
}