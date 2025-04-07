import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  Text,
} from '@chakra-ui/react';
import { useLayout } from '../../contexts/LayoutContext';
import { useTheme } from '../../contexts/ThemeContext';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigPanel({ isOpen, onClose }: ConfigPanelProps) {
  const { layoutConfig, updateLayoutConfig } = useLayout();
  const { themeConfig, updateThemeConfig, toggleColorMode, toggleHighContrast } = useTheme();

  // Update grid columns
  const handleColumnsChange = (value: string) => {
    const columns = parseInt(value);
    if (!isNaN(columns) && columns > 0) {
      updateLayoutConfig({
        ...layoutConfig,
        grid: {
          ...layoutConfig.grid,
          columns,
        },
      });
    }
  };

  // Update grid rows
  const handleRowsChange = (value: string) => {
    const rows = parseInt(value);
    if (!isNaN(rows) && rows > 0) {
      updateLayoutConfig({
        ...layoutConfig,
        grid: {
          ...layoutConfig.grid,
          rows,
        },
      });
    }
  };

  // Update font size
  const handleFontSizeChange = (value: string) => {
    const fontSize = parseInt(value);
    if (!isNaN(fontSize) && fontSize > 0) {
      updateThemeConfig({
        fontSizeBase: fontSize,
      });
    }
  };

  // Update primary color
  const handlePrimaryColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateThemeConfig({
      primaryColor: e.target.value,
    });
  };

  // Update accent color
  const handleAccentColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateThemeConfig({
      accentColor: e.target.value,
    });
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Configuration</DrawerHeader>

        <DrawerBody>
          <Tabs>
            <TabList>
              <Tab>Layout</Tab>
              <Tab>Theme</Tab>
            </TabList>

            <TabPanels>
              {/* Layout Configuration */}
              <TabPanel>
                <VStack spacing={5} align="stretch">
                  <Text>Grid Configuration</Text>
                  <HStack>
                    <FormControl>
                      <FormLabel>Columns</FormLabel>
                      <NumberInput
                        min={1}
                        max={24}
                        value={layoutConfig.grid.columns}
                        onChange={handleColumnsChange}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Rows</FormLabel>
                      <NumberInput
                        min={1}
                        max={24}
                        value={layoutConfig.grid.rows}
                        onChange={handleRowsChange}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  </HStack>

                  <Box pt={4}>
                    <Text>Current Layout:</Text>
                    <Text fontSize="sm" mt={2}>
                      Grid: {layoutConfig.grid.columns} × {layoutConfig.grid.rows}
                    </Text>
                    <Text fontSize="sm">
                      Widgets: {layoutConfig.widgets.length}
                    </Text>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Theme Configuration */}
              <TabPanel>
                <VStack spacing={5} align="stretch">
                  <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="color-mode" mb="0">
                      Dark Mode
                    </FormLabel>
                    <Switch
                      id="color-mode"
                      isChecked={themeConfig.colorMode === 'dark'}
                      onChange={toggleColorMode}
                    />
                  </FormControl>

                  <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="high-contrast" mb="0">
                      High Contrast
                    </FormLabel>
                    <Switch
                      id="high-contrast"
                      isChecked={themeConfig.highContrast}
                      onChange={toggleHighContrast}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Base Font Size</FormLabel>
                    <NumberInput
                      min={8}
                      max={32}
                      value={themeConfig.fontSizeBase}
                      onChange={handleFontSizeChange}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Primary Color</FormLabel>
                    <Select value={themeConfig.primaryColor} onChange={handlePrimaryColorChange}>
                      <option value="blue.500">Blue</option>
                      <option value="teal.500">Teal</option>
                      <option value="green.500">Green</option>
                      <option value="purple.500">Purple</option>
                      <option value="red.500">Red</option>
                      <option value="orange.500">Orange</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Accent Color</FormLabel>
                    <Select value={themeConfig.accentColor} onChange={handleAccentColorChange}>
                      <option value="blue.400">Blue</option>
                      <option value="teal.400">Teal</option>
                      <option value="green.400">Green</option>
                      <option value="purple.400">Purple</option>
                      <option value="red.400">Red</option>
                      <option value="orange.400">Orange</option>
                    </Select>
                  </FormControl>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </DrawerBody>

        <DrawerFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}