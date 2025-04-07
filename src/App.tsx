import { 
  Box, 
  Button, 
  Center, 
  Heading, 
  IconButton, 
  Text, 
  VStack, 
  useDisclosure 
} from '@chakra-ui/react';
import { useEffect } from 'react';
import Grid from './components/layout/Grid';
import GridItem from './components/layout/GridItem';
import ConfigPanel from './components/settings/ConfigPanel';
import { useLayout } from './contexts/LayoutContext';

function App() {
  const { layoutConfig, updateLayoutConfig } = useLayout();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Set up initial layout
  useEffect(() => {
    // Only set up default widgets if none exist yet
    if (layoutConfig.widgets.length === 0) {
      updateLayoutConfig({
        ...layoutConfig,
        widgets: [
          {
            id: 'welcome',
            x: 3,
            y: 3,
            width: 6,
            height: 6,
            visible: true,
          },
        ],
      });
    }
  }, [layoutConfig, updateLayoutConfig]);

  return (
    <Box width="100%" height="100%">
      {/* Main Grid Layout */}
      <Grid>
        {layoutConfig.widgets.map((widget) => (
          <GridItem key={widget.id} config={widget}>
            {widget.id === 'welcome' && (
              <Center height="100%">
                <VStack spacing={6}>
                  <Heading size="2xl">Kiosk App</Heading>
                  <Text fontSize="lg">Grid-based layout system is ready!</Text>
                  <Text color="gray.400">Task 1.3: Core Layout System ✓</Text>
                  <Button onClick={onOpen} colorScheme="blue">
                    Open Configuration
                  </Button>
                </VStack>
              </Center>
            )}
          </GridItem>
        ))}
      </Grid>

      {/* Configuration Panel */}
      <ConfigPanel isOpen={isOpen} onClose={onClose} />
      
      {/* Settings Button (Visible when panel is closed) */}
      {!isOpen && (
        <IconButton
          aria-label="Settings"
          icon={<span>⚙️</span>}
          position="absolute"
          bottom={4}
          right={4}
          borderRadius="full"
          size="lg"
          onClick={onOpen}
          opacity={0.7}
          _hover={{ opacity: 1 }}
        />
      )}
    </Box>
  );
}

export default App;
