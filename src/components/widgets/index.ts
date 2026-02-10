// Export all widget metadata objects for registration
import { clockWidgetMetadata } from './clock';

// Array of all widget metadata for easy registration
export const allWidgets = [
  clockWidgetMetadata,
];

// Re-export individual widgets
export * from './clock';

// Export clockWidgetMetadata directly for debugging 
export { clockWidgetMetadata };