import { Box, BoxProps } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { useLayout } from '../../contexts/LayoutContext';

interface GridProps extends BoxProps {
  children: ReactNode;
}

export default function Grid({ children, ...props }: GridProps) {
  const { layoutConfig } = useLayout();
  const { columns, rows } = layoutConfig.grid;

  return (
    <Box
      width="100%"
      height="100%"
      position="relative"
      display="grid"
      gridTemplateColumns={`repeat(${columns}, 1fr)`}
      gridTemplateRows={`repeat(${rows}, 1fr)`}
      gap="2px"
      {...props}
    >
      {children}
    </Box>
  );
}