import { useCallback, useEffect, useState } from 'react';
import { useWidgetRegistry } from '../contexts/WidgetRegistryContext';
import * as IndexedDBStorage from '../utils/indexedDbStorage';

// Widget data with metadata
export interface WidgetData<T = unknown> {
  id: string;
  widgetId: string;
  type: string;
  data: T;
  updatedAt: number;
  ttl?: number; // Time to live in milliseconds
}

// Hook result
interface UseWidgetDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  saveData: (data: T) => Promise<void>;
  refreshData: () => Promise<void>;
  clearData: () => Promise<void>;
}

/**
 * Custom hook for managing widget-specific data
 * @param widgetId The ID of the widget
 * @param initialData Optional initial data
 * @param ttl Optional time to live in milliseconds
 */
export function useWidgetData<T = unknown>(
  widgetId: string,
  initialData: T | null = null,
  ttl?: number,
): UseWidgetDataResult<T> {
  const { getWidget } = useWidgetRegistry();
  const widget = getWidget(widgetId);
  
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Fixed dataId based on widgetId
  const dataId = `widget_data_${widgetId}`;

  // Load data on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!widget) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to load data from IndexedDB
        const result = await IndexedDBStorage.getData<WidgetData<T>>('data', dataId);
        
        if (result) {
          // Check if data has expired
          if (result.ttl && result.updatedAt + result.ttl < Date.now()) {
            // Data has expired, clear it
            if (isMounted) {
              setData(initialData);
            }
            
            // Remove expired data from storage
            await IndexedDBStorage.deleteData('data', dataId);
          } else {
            // Data is valid
            if (isMounted) {
              setData(result.data);
            }
          }
        } else {
          // No data found
          if (isMounted) {
            setData(initialData);
          }
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [widgetId, dataId, initialData, widget]);

  // Save data to storage
  const saveData = useCallback(async (newData: T): Promise<void> => {
    if (!widget) {
      throw new Error(`Widget with ID ${widgetId} not found`);
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const widgetData: WidgetData<T> = {
        id: dataId,
        widgetId,
        type: widget.config.type,
        data: newData,
        updatedAt: Date.now(),
        ttl,
      };
      
      await IndexedDBStorage.putData('data', widgetData);
      setData(newData);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [widgetId, dataId, ttl, widget]);

  // Refresh data (to be implemented by the widget-specific logic)
  const refreshData = useCallback(async (): Promise<void> => {
    // This is a placeholder. Each widget should implement its own refresh logic
    // using this as a base, by wrapping this hook and adding refresh functionality.
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real widget, this would fetch fresh data from an API or other source
      console.log(`Refreshing data for widget ${widgetId}`);
      
      // For now, we just reload the data from storage
      const result = await IndexedDBStorage.getData<WidgetData<T>>('data', dataId);
      
      if (result) {
        setData(result.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [widgetId, dataId]);

  // Clear data from storage
  const clearData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await IndexedDBStorage.deleteData('data', dataId);
      setData(initialData);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [dataId, initialData]);

  return {
    data,
    isLoading,
    error,
    saveData,
    refreshData,
    clearData,
  };
}