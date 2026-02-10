import { ClockWidgetConfig, WidgetProps } from '../../../types/widget';
import ClockDisplay from './ClockDisplay';

export default function ClockWidget({ config }: WidgetProps<ClockWidgetConfig>) {
  try {
    return (
      <div className="h-full p-2" data-testid="clock-widget">
        {config.appearance.showTitle && (
          <h3 className="text-sm font-semibold mb-2">
            {config.title}
          </h3>
        )}
        <ClockDisplay config={config} />
      </div>
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error rendering ClockWidget: ${errorMessage}`);

    // Fallback rendering in case of error
    return (
      <div className="h-full p-2 bg-red-200 text-red-900 rounded-md">
        <h3 className="text-sm font-semibold">Clock Error</h3>
        <div>{errorMessage}</div>
        <div className="text-xs mt-2">Check console for details</div>
      </div>
    );
  }
}