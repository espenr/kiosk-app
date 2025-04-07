import { useCallback, useState } from 'react';
import * as LocalStorage from '../utils/storage';
import * as IndexedDBStorage from '../utils/indexedDbStorage';

// Storage type
export enum StorageType {
  LOCAL_STORAGE = 'localStorage',
  INDEXED_DB = 'indexedDB',
  AUTO = 'auto', // Automatically choose based on data size
}

// Storage hook interface
interface UseStorageResult<T> {
  data: T | null;
  setData: (data: T) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  removeData: () => Promise<void>;
}

// Size threshold for using IndexedDB instead of localStorage (in bytes)
const SIZE_THRESHOLD = 100 * 1024; // 100KB

/**
 * Custom hook for abstracting storage operations
 * Automatically chooses the appropriate storage method based on data size and type
 */
export function useStorage<T>(
  key: string,
  defaultValue: T | null = null,
  storageType: StorageType = StorageType.AUTO,
): UseStorageResult<T> {
  const [data, setDataState] = useState<T | null>(() => {
    try {
      return LocalStorage.loadFromStorage<T>(key, defaultValue as T);
    } catch (error) {
      console.error(`Error loading data from storage with key "${key}":`, error);
      return defaultValue;
    }
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Determine which storage to use based on data size and specified type
  const determineStorageType = useCallback((data: T): StorageType => {
    if (storageType !== StorageType.AUTO) {
      return storageType;
    }
    
    try {
      // Estimate data size by serializing it
      const serialized = JSON.stringify(data);
      const size = new Blob([serialized]).size;
      
      return size > SIZE_THRESHOLD
        ? StorageType.INDEXED_DB
        : StorageType.LOCAL_STORAGE;
    } catch (error) {
      // If we can't determine size, default to localStorage
      console.warn('Could not determine data size, defaulting to localStorage:', error);
      return StorageType.LOCAL_STORAGE;
    }
  }, [storageType]);

  // Set data in the appropriate storage
  const setData = useCallback(async (newData: T): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const storage = determineStorageType(newData);
      
      if (storage === StorageType.INDEXED_DB) {
        // For IndexedDB, data must have an ID property
        if (typeof newData === 'object' && newData !== null && 'id' in newData) {
          await IndexedDBStorage.putData('data', newData as { id: string });
        } else {
          // If data doesn't have an ID, create a wrapper object
          await IndexedDBStorage.putData('data', {
            id: key,
            value: newData,
            updatedAt: Date.now(),
          });
        }
      } else {
        // For localStorage
        LocalStorage.saveToStorage(key, newData);
      }
      
      setDataState(newData);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key, determineStorageType]);

  // Remove data from storage
  const removeData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to remove from both storage types
      try {
        LocalStorage.removeFromStorage(key);
      } catch (error) {
        console.warn(`Error removing data from localStorage with key "${key}":`, error);
      }
      
      try {
        await IndexedDBStorage.deleteData('data', key);
      } catch (error) {
        console.warn(`Error removing data from IndexedDB with key "${key}":`, error);
      }
      
      setDataState(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  return {
    data,
    setData,
    isLoading,
    error,
    removeData,
  };
}