import { useEffect, useState } from 'react';
import { useWidgetRegistry } from '../../contexts/WidgetRegistryContext';
import { allWidgets } from './index';
import logger, { LogSource } from '../../services/logger';
import { clockWidgetMetadata, registerClockWidget } from './clock/register';

// Component for registering all available widgets
export default function WidgetRegistration() {
  const { registerWidgetType, widgetTypes } = useWidgetRegistry();
  const [registrationAttempted, setRegistrationAttempted] = useState(false);

  // Register all widgets on component mount
  useEffect(() => {
    console.log('WidgetRegistration component mounted');
    console.log('Available widgets to register:', allWidgets);
    
    try {
      // Register each widget type
      allWidgets.forEach(metadata => {
        if (!metadata) {
          console.error('Invalid widget metadata found in allWidgets array');
          return;
        }
        console.log(`Registering widget type: ${metadata.type}`, metadata);
        registerWidgetType(metadata);
      });
      
      // Ensure the clock widget is specifically registered using the direct method
      console.log('Ensuring clock widget is registered using direct registration method');
      registerClockWidget(registerWidgetType);
      
      console.log('Widget registration complete');
      console.log('Registered widget types:', Array.from(widgetTypes.keys()));
      
      setRegistrationAttempted(true);
      
      // LOGGING DISABLED - This was the source of the log flood
      // logger.info('Widget registration completed successfully', LogSource.APP, {
      //   registeredTypes: Array.from(widgetTypes.keys())
      // });
    } catch (error) {
      console.error('Error during widget registration:', error);
      logger.error(
        'Error during widget registration', 
        LogSource.APP, 
        { component: 'WidgetRegistration' }, 
        error instanceof Error ? error : new Error(String(error))
      );
      setRegistrationAttempted(true);
    }

    // No cleanup needed, widgets stay registered
  }, [registerWidgetType]);

  // Check registration results after the effect has run
  useEffect(() => {
    if (registrationAttempted) {
      console.log('Registration verification:');
      console.log('- Clock widget registered:', widgetTypes.has('clock'));
      console.log('- All registered types:', Array.from(widgetTypes.keys()));
      
      // Check if clock widget wasn't registered successfully
      if (!widgetTypes.has('clock')) {
        console.error('CRITICAL: Clock widget is not registered despite registration attempt!');
        logger.error(
          'Clock widget registration failure', 
          LogSource.APP, 
          { 
            component: 'WidgetRegistration',
            registeredTypes: Array.from(widgetTypes.keys())
          }
        );
        
        // Try one more time using direct method
        try {
          console.log('Attempting emergency registration of clock widget using direct method');
          registerClockWidget(registerWidgetType);
          
          // Double check after a short delay
          setTimeout(() => {
            console.log('Emergency registration complete. Clock registered:', widgetTypes.has('clock'));
            
            // Last-ditch attempt if still not registered
            if (!widgetTypes.has('clock')) {
              console.error('CRITICAL: Clock widget still not registered. Trying metadata directly');
              try {
                registerWidgetType(clockWidgetMetadata);
                console.log('Last-ditch registration attempt complete. Clock registered:', widgetTypes.has('clock'));
              } catch (lastError) {
                console.error('Last-ditch registration failed:', lastError);
              }
            }
          }, 500);
        } catch (error) {
          console.error('Emergency registration failed:', error);
        }
      }
    }
  }, [registrationAttempted, widgetTypes, registerWidgetType]);

  // This component doesn't render anything
  return null;
}