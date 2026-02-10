/**
 * Direct registration file for clock widget
 * This file exports a function that will register the clock widget with the registry
 */

import React from 'react';
import { ClockWidgetConfig, WidgetMetadata, WidgetProps, WidgetConfig } from '../../../types/widget';
import ClockWidget from './ClockWidget';

// Default configuration for the clock widget
const defaultConfig: Omit<ClockWidgetConfig, 'id'> = {
  type: 'clock',
  title: 'Clock',
  visible: true,
  position: {
    x: 0,
    y: 0,
    width: 4,
    height: 2,
  },
  appearance: {
    backgroundColor: 'transparent',
    textColor: 'white',
    showTitle: false,
    borderRadius: 8,
    opacity: 1,
  },
  refreshInterval: 1000, // Update every second
  clockSettings: {
    showSeconds: true,
    showDate: true,
    use24HourFormat: true,
    dateFormat: 'full',
    timezone: undefined, // Use local timezone by default
  },
};

// Create a wrapper component that handles type casting
const ClockWidgetWrapper: React.FC<WidgetProps<WidgetConfig>> = (props) => {
  console.log('ClockWidgetWrapper direct rendering with props:', props);
  
  // Check if config has the required clockSettings property
  const config = props.config as Partial<ClockWidgetConfig>;
  
  if (!config.clockSettings) {
    console.error('Missing clockSettings in widget config:', config);
    
    // Create default clockSettings if missing
    config.clockSettings = {
      showSeconds: true,
      showDate: true,
      use24HourFormat: true,
      dateFormat: 'full',
    };
  }
  
  // Render the clock widget with the validated config
  return React.createElement(ClockWidget, {
    config: config as ClockWidgetConfig,
    onConfigChange: props.onConfigChange
  });
};

// Metadata for the clock widget
export const clockWidgetMetadata: WidgetMetadata = {
  type: 'clock',
  name: 'Clock',
  description: 'Digital clock with date display and timezone support',
  defaultConfig,
  component: ClockWidgetWrapper,
  icon: '⏰', // Clock emoji as icon
  previewImage: undefined, // No preview image for now
};

// Function to manually register this widget
export function registerClockWidget(registerFunction: (metadata: WidgetMetadata) => void): void {
  console.log('[DIRECT REGISTRATION] Registering clock widget with metadata:', clockWidgetMetadata);
  registerFunction(clockWidgetMetadata);
}