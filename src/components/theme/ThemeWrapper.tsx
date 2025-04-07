import { Box, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ReactNode, useEffect, useMemo } from 'react';
import { ThemeConfig, useTheme } from '../../contexts/ThemeContext';

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { themeConfig } = useTheme();
  
  // Create Chakra theme from our theme config
  const theme = useMemo(() => createThemeFromConfig(themeConfig), [themeConfig]);
  
  // Apply body background color when theme changes
  useEffect(() => {
    document.body.style.backgroundColor = themeConfig.colorMode === 'dark' 
      ? '#171923' // gray.900
      : '#F7FAFC'; // gray.50
  }, [themeConfig.colorMode]);

  return (
    <ChakraProvider theme={theme}>
      <Box 
        width="100%" 
        height="100vh" 
        bg={themeConfig.backgroundColor}
        color={themeConfig.textColor}
        transition="background-color 0.3s, color 0.3s"
        fontSize={`${themeConfig.fontSizeBase}px`}
      >
        {children}
      </Box>
    </ChakraProvider>
  );
}

// Helper function to create a Chakra theme from our theme config
function createThemeFromConfig(config: ThemeConfig) {
  return extendTheme({
    config: {
      initialColorMode: config.colorMode,
      useSystemColorMode: false,
    },
    colors: {
      primary: {
        500: config.primaryColor,
      },
      accent: {
        400: config.accentColor,
      },
    },
    styles: {
      global: {
        body: {
          bg: config.backgroundColor,
          color: config.textColor,
        },
      },
    },
    components: {
      Button: {
        baseStyle: {
          _focus: {
            boxShadow: config.highContrast 
              ? '0 0 0 3px yellow.400' 
              : '0 0 0 3px blue.400',
          },
        },
      },
      Text: {
        baseStyle: {
          fontSize: `${config.fontSizeBase}px`,
        },
      },
      Heading: {
        baseStyle: {
          fontWeight: config.highContrast ? 'bold' : 'semibold',
        },
      },
    },
  });
}