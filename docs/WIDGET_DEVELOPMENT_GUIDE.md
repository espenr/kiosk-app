# Widget Development Guide

This guide provides instructions and best practices for developing widgets for the Kiosk Application.

## Widget Architecture

Each widget in our application follows a consistent architecture:

1. **Widget Component**: The main React component that renders the widget
2. **Widget Configuration**: TypeScript interface defining the widget's configuration options
3. **Widget Registration**: Integration with the widget registry system
4. **Widget Data Handling**: Methods for handling widget-specific data
5. **Widget Configuration UI**: Components for configuring the widget

## Creating a New Widget

### 1. Define Widget Types

Add your widget type to the `WidgetType` union in `src/types/widget.ts`:

```typescript
export type WidgetType = 
  | 'clock'        // Clock/date widget
  | 'weather'      // Weather widget
  | 'calendar'     // Calendar widget
  | 'myNewWidget'; // Your new widget type
```

### 2. Define Widget Configuration

Create a configuration interface for your widget that extends `BaseWidgetConfig`:

```typescript
export interface MyNewWidgetConfig extends BaseWidgetConfig {
  type: 'myNewWidget';
  // Add widget-specific configuration properties here
  someOption: string;
  anotherOption: boolean;
}

// Add to the WidgetConfig union type
export type WidgetConfig = 
  | ClockWidgetConfig
  | WeatherWidgetConfig
  | MyNewWidgetConfig;
```

### 3. Create Widget Component

Create a new component for your widget:

```typescript
// src/components/widgets/MyNewWidget.tsx
import React from 'react';
import { Box } from '@chakra-ui/react';
import { useWidgetRegistry } from '../../hooks/useWidgetRegistry';
import { MyNewWidgetConfig } from '../../types/widget';

interface MyNewWidgetProps {
  id: string;
}

export const MyNewWidget: React.FC<MyNewWidgetProps> = ({ id }) => {
  // Get widget instance from registry
  const { getWidget } = useWidgetRegistry();
  const widget = getWidget(id) as MyNewWidgetConfig;
  
  if (!widget) return null;
  
  // Implement widget rendering logic
  return (
    <Box p={4}>
      {/* Widget content goes here */}
      <div>My New Widget</div>
      <div>Option: {widget.someOption}</div>
    </Box>
  );
};
```

### 4. Create Configuration Component

Create a component for configuring your widget:

```typescript
// src/components/widgets/config/MyNewWidgetConfig.tsx
import React from 'react';
import { Box, FormControl, FormLabel, Input, Switch } from '@chakra-ui/react';
import { useWidgetRegistry } from '../../../hooks/useWidgetRegistry';
import { MyNewWidgetConfig } from '../../../types/widget';

interface MyNewWidgetConfigProps {
  id: string;
}

export const MyNewWidgetConfig: React.FC<MyNewWidgetConfigProps> = ({ id }) => {
  const { getWidget, updateWidget } = useWidgetRegistry();
  const widget = getWidget(id) as MyNewWidgetConfig;
  
  if (!widget) return null;
  
  const handleSomeOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidget(id, { someOption: e.target.value });
  };
  
  const handleAnotherOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWidget(id, { anotherOption: e.target.checked });
  };
  
  return (
    <Box>
      <FormControl mb={3}>
        <FormLabel>Some Option</FormLabel>
        <Input 
          value={widget.someOption} 
          onChange={handleSomeOptionChange} 
        />
      </FormControl>
      
      <FormControl>
        <FormLabel>Another Option</FormLabel>
        <Switch 
          isChecked={widget.anotherOption} 
          onChange={handleAnotherOptionChange} 
        />
      </FormControl>
    </Box>
  );
};
```

### 5. Register Widget Type

Register your widget in the application's initialization:

```typescript
// In your initialization code (e.g., App.tsx or a dedicated init file)
import { useWidgetRegistry } from './hooks/useWidgetRegistry';
import { MyNewWidget } from './components/widgets/MyNewWidget';
import { MyNewWidgetConfig } from './components/widgets/config/MyNewWidgetConfig';

const App: React.FC = () => {
  const { registerWidgetType } = useWidgetRegistry();
  
  // Register widget on component mount
  React.useEffect(() => {
    registerWidgetType({
      type: 'myNewWidget',
      name: 'My New Widget',
      description: 'Description of my new widget',
      component: MyNewWidget,
      configComponent: MyNewWidgetConfig,
      defaultConfig: {
        type: 'myNewWidget',
        someOption: 'default value',
        anotherOption: false,
        // Include all required BaseWidgetConfig properties
        width: 2,
        height: 2,
        x: 0,
        y: 0,
        title: 'My New Widget',
      },
      capabilities: {
        hasConfiguration: true,
        canResize: true,
        canMove: true,
        refreshable: false,
      }
    });
  }, [registerWidgetType]);
  
  // Rest of your component
};
```

## Widget Data Handling

If your widget needs to fetch or store data:

```typescript
import { useWidgetData } from '../../hooks/useWidgetData';

// In your widget component
const MyWidgetWithData: React.FC<MyWidgetProps> = ({ id }) => {
  const { data, isLoading, error, refresh } = useWidgetData(
    id,
    async () => {
      // Fetch data from API or other source
      const response = await fetch('https://api.example.com/data');
      return response.json();
    },
    {
      ttl: 60000, // Cache for 1 minute
      refreshInterval: 300000 // Refresh every 5 minutes
    }
  );
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <Box>
      <div>{data.someProperty}</div>
      <button onClick={refresh}>Refresh</button>
    </Box>
  );
};
```

## Best Practices

1. **Performance**:
   - Use React.memo for components that don't need frequent re-renders
   - Implement useMemo and useCallback for expensive calculations
   - Consider implementing virtualization for lists/grids

2. **Styling**:
   - Use Chakra UI components for consistent styling
   - Support both light and dark themes
   - Make widgets responsive to container size changes

3. **Configuration**:
   - Provide sensible defaults for all configuration options
   - Validate input in configuration components
   - Update the UI immediately when configuration changes

4. **Error Handling**:
   - Implement error boundaries around widget content
   - Provide user-friendly error messages
   - Implement retry mechanisms for network requests

5. **Testing**:
   - Create unit tests for widget logic
   - Create component tests for rendering
   - Test with different configurations and edge cases

## Widget Lifecycle

Understand the lifecycle of widgets in our application:

1. **Registration**: Widget type is registered with the widget registry
2. **Creation**: Widget instance is created with default or provided configuration
3. **Rendering**: Widget component is rendered based on its configuration
4. **Updates**: Widget configuration can be updated through the registry
5. **Data Fetching**: Widget can fetch and refresh its data
6. **Deletion**: Widget instance can be removed from the registry

## Debugging Tips

1. Use the browser's React DevTools to inspect widget state and props
2. Check browser console for errors
3. Use the application's built-in logging system
4. Test widgets in isolation using the widget test pages

## Example Widgets

For reference, see the implementation of existing widgets:

1. Clock/Date Widget (`src/components/widgets/ClockWidget.tsx`)
2. Weather Widget (coming soon)
3. Calendar Widget (coming soon)