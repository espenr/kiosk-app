import { useEffect, useMemo, useState } from 'react';
import { ClockWidgetConfig } from '../../../types/widget';

interface ClockDisplayProps {
  config: ClockWidgetConfig;
}

export default function ClockDisplay({ config }: ClockDisplayProps) {
  const { clockSettings } = config;
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every second (or configurable interval)
  useEffect(() => {
    // LOGGING DISABLED
    // logger.info('ClockDisplay mounted', LogSource.WIDGET, {
    //   widgetId: config.id,
    //   widgetType: 'clock',
    //   componentName: 'ClockDisplay'
    // });
    
    try {
      // Align with second boundaries for smooth updates
      const msUntilNextSecond = 1000 - (new Date().getMilliseconds());
      
      // Initial timeout to sync with seconds
      const initialTimeout = setTimeout(() => {
        setCurrentTime(new Date());
        
        // Then set the interval for regular updates
        const intervalId = setInterval(() => {
          try {
            setCurrentTime(new Date());
          } catch (error) {
            // LOGGING DISABLED 
            console.error('Error updating clock time', error);
            // logger.error(
            //   'Error updating clock time', 
            //   LogSource.WIDGET, 
            //   {
            //     widgetId: config.id,
            //     widgetType: 'clock',
            //     componentName: 'ClockDisplay'
            //   },
            //   error instanceof Error ? error : new Error(String(error))
            // );
          }
        }, 1000);
        
        return () => {
          clearInterval(intervalId);
          // LOGGING DISABLED
          // logger.info('Clearing clock interval', LogSource.WIDGET, {
          //   widgetId: config.id,
          //   componentName: 'ClockDisplay'
          // });
        };
      }, msUntilNextSecond);
      
      return () => {
        clearTimeout(initialTimeout);
        // LOGGING DISABLED
        // logger.info('ClockDisplay unmounted', LogSource.WIDGET, {
        //   widgetId: config.id,
        //   componentName: 'ClockDisplay'
        // });
      };
    } catch (error) {
      // LOGGING DISABLED
      console.error('Error setting up clock timer', error);
      // logger.error(
      //   'Error setting up clock timer', 
      //   LogSource.WIDGET, 
      //   {
      //     widgetId: config.id,
      //     widgetType: 'clock',
      //     componentName: 'ClockDisplay'
      //   },
      //   error instanceof Error ? error : new Error(String(error))
      // );
      return () => {};
    }
  }, [config.id]);
  
  // Format the time based on settings
  const formattedTime = useMemo(() => {
    try {
      // Add a deliberate error for testing logging
      if (config.id === "test-error-logging") {
        throw new Error("Test error for logging system");
      }
      
      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: 'numeric',
        ...(clockSettings.showSeconds && { second: 'numeric' }),
        hour12: !clockSettings.use24HourFormat,
      };
      
      // Use specified timezone if available
      if (clockSettings.timezone) {
        options.timeZone = clockSettings.timezone;
      }
      
      return new Intl.DateTimeFormat(navigator.language, options).format(currentTime);
    } catch (error) {
      // Log the error to the server
      // LOGGING DISABLED
      console.error('Error formatting time', error);
      // logger.error(
      //   'Error formatting time',
      //   LogSource.WIDGET,
      //   {
      //     widgetId: config.id,
      //     widgetType: 'clock',
      //     componentName: 'ClockDisplay',
      //     function: 'formattedTime'
      //   },
      //   error instanceof Error ? error : new Error(String(error))
      // );
      
      // Return a fallback format
      return new Date().toLocaleTimeString();
    }
  }, [currentTime, clockSettings, config.id]);
  
  // Format the date based on settings
  const formattedDate = useMemo(() => {
    if (!clockSettings.showDate) return null;
    
    // Use custom format if provided, otherwise use the default format
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    // Use specified timezone if available
    if (clockSettings.timezone) {
      options.timeZone = clockSettings.timezone;
    }
    
    // If a custom date format is specified, use it
    if (clockSettings.dateFormat) {
      // This is a simplified approach - in a real implementation
      // we would parse the format string and build the options dynamically
      return new Intl.DateTimeFormat(navigator.language, options).format(currentTime);
    }
    
    return new Intl.DateTimeFormat(navigator.language, options).format(currentTime);
  }, [currentTime, clockSettings]);
  
  return (
    <div className="flex flex-col items-start space-y-0">
      <div className="text-4xl font-bold leading-none">
        {formattedTime}
      </div>
      {clockSettings.showDate && (
        <div className="text-xl opacity-80">
          {formattedDate}
        </div>
      )}
    </div>
  );
}