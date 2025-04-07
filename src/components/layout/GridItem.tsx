import { Box, BoxProps } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { WidgetPosition } from '../../contexts/LayoutContext';

interface GridItemProps extends BoxProps {
  children: ReactNode;
  config: WidgetPosition;
}

export default function GridItem({ children, config, ...props }: GridItemProps) {
  const { x, y, width, height, visible } = config;
  
  if (!visible) return null;

  return (
    <Box
      position="relative"
      gridColumnStart={x + 1}
      gridColumnEnd={x + width + 1}
      gridRowStart={y + 1}
      gridRowEnd={y + height + 1}
      bg="whiteAlpha.100"
      borderRadius="md"
      padding={2}
      overflow="hidden"
      {...props}
    >
      {children}
    </Box>
  );
}