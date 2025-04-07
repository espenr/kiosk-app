/**
 * Widget type definitions
 */

import { ReactNode } from 'react';

/**
 * Unique identifier for widget types
 */
export type WidgetType = 
  | 'clock'        // Clock/date widget
  | 'weather'      // Weather widget
  | 'calendar'     // Calendar widget
  | 'photo'        // Photo gallery widget
  | 'transport'    // Public transport widget
  | 'custom';      // Custom/user-defined widget

/**
 * Base widget configuration
 * Common configuration properties for all widgets
 */
export interface BaseWidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  visible: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  appearance: {
    backgroundColor?: string;
    textColor?: string;
    showTitle: boolean;
    borderRadius?: number;
    opacity?: number;
  };
  refreshInterval?: number; // In milliseconds, undefined means no auto-refresh
}

/**
 * Clock widget configuration
 */
export interface ClockWidgetConfig extends BaseWidgetConfig {
  type: 'clock';
  clockSettings: {
    showSeconds: boolean;
    showDate: boolean;
    use24HourFormat: boolean;
    timezone?: string; // IANA timezone, e.g., 'Europe/Oslo'
    dateFormat?: string; // Date format string
  };
}

/**
 * Weather widget configuration
 */
export interface WeatherWidgetConfig extends BaseWidgetConfig {
  type: 'weather';
  weatherSettings: {
    location: string;
    units: 'metric' | 'imperial';
    showForecast: boolean;
    forecastDays: number;
    showHourlyForecast: boolean;
    apiKey?: string; // API key for weather service
  };
}

/**
 * Calendar widget configuration
 */
export interface CalendarWidgetConfig extends BaseWidgetConfig {
  type: 'calendar';
  calendarSettings: {
    showWeekNumbers: boolean;
    calendars: string[]; // IDs of calendars to display
    daysToShow: number;
    showAllDayEvents: boolean;
    maxEvents: number;
    colorCoding: boolean;
  };
}

/**
 * Photo widget configuration
 */
export interface PhotoWidgetConfig extends BaseWidgetConfig {
  type: 'photo';
  photoSettings: {
    sources: string[]; // Photo sources/directories
    interval: number; // Time between photos in milliseconds
    transition: 'fade' | 'slide' | 'zoom' | 'none';
    showCaption: boolean;
    shuffle: boolean;
    fillMode: 'cover' | 'contain' | 'stretch';
  };
}

/**
 * Transport widget configuration
 */
export interface TransportWidgetConfig extends BaseWidgetConfig {
  type: 'transport';
  transportSettings: {
    stations: string[]; // Station IDs
    maxDepartures: number;
    transportTypes: ('bus' | 'train' | 'metro' | 'tram' | 'ferry')[];
    showDelays: boolean;
    timeWindow: number; // Time window in minutes
  };
}

/**
 * Custom widget configuration
 */
export interface CustomWidgetConfig extends BaseWidgetConfig {
  type: 'custom';
  customSettings: {
    componentName: string; // Name of the custom component
    [key: string]: unknown; // Additional custom settings
  };
}

/**
 * Union type for all widget configurations
 */
export type WidgetConfig = 
  | ClockWidgetConfig
  | WeatherWidgetConfig
  | CalendarWidgetConfig
  | PhotoWidgetConfig
  | TransportWidgetConfig
  | CustomWidgetConfig;

/**
 * Widget component props
 */
export interface WidgetProps<T extends WidgetConfig = WidgetConfig> {
  config: T;
  onConfigChange?: (newConfig: T) => void;
}

/**
 * Widget metadata for registration
 */
export interface WidgetMetadata {
  type: WidgetType;
  name: string;
  description: string;
  defaultConfig: Omit<WidgetConfig, 'id'>;
  component: React.ComponentType<WidgetProps>;
  icon?: ReactNode; // Icon for the widget in the UI
  previewImage?: string; // URL to preview image
}

/**
 * Widget capability flags
 */
export interface WidgetCapabilities {
  resizable: boolean;
  movable: boolean;
  configurable: boolean;
  refreshable: boolean;
}

/**
 * Widget instance with runtime data
 */
export interface WidgetInstance {
  config: WidgetConfig;
  metadata: WidgetMetadata;
  capabilities: WidgetCapabilities;
  isLoading?: boolean;
  error?: Error | null;
}