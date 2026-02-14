/**
 * Enhanced storage utility for persisting application configuration
 * with versioning and migration support
 */

// Storage item with versioning
interface StorageItem<T> {
  version: number;
  data: T;
  timestamp: number;
}

// Storage error types
export enum StorageErrorType {
  SERIALIZATION = 'serialization',
  DESERIALIZATION = 'deserialization',
  STORAGE_FULL = 'storage_full',
  QUOTA_EXCEEDED = 'quota_exceeded',
  STORAGE_UNAVAILABLE = 'storage_unavailable',
  VERSION_MISMATCH = 'version_mismatch',
  UNKNOWN = 'unknown',
}

// Custom storage error
export class StorageError extends Error {
  type: StorageErrorType;
  key?: string;
  originalError?: Error;

  constructor(type: StorageErrorType, message: string, key?: string, originalError?: Error) {
    super(message);
    this.name = 'StorageError';
    this.type = type;
    this.key = key;
    this.originalError = originalError;
  }
}

// Storage migration function type
export type MigrationFunction<T> = (oldData: unknown, oldVersion: number) => T;

// Storage migration entry
interface MigrationEntry<T> {
  version: number;
  migrate: MigrationFunction<T>;
}

// Current version of each storage item
const CURRENT_VERSIONS: Record<string, number> = {
  'kiosk-app:layout-config': 1,
  'kiosk-app:theme-config': 1,
  'kiosk-app:settings': 1,
  'kiosk-app:widgets': 1,
  'kiosk-app:app-state': 1,
};

// Migration registry for version updates
const migrations: Record<string, MigrationEntry<unknown>[]> = {};

// Register a migration function for a specific key and version
export function registerMigration<T>(key: string, version: number, migrate: MigrationFunction<T>): void {
  if (!migrations[key]) {
    migrations[key] = [];
  }
  
  migrations[key].push({ version, migrate });
  
  // Sort migrations by version
  migrations[key].sort((a, b) => a.version - b.version);
}

// Check if localStorage is available
function isStorageAvailable(): boolean {
  try {
    const storage = window.localStorage;
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Save data to local storage with versioning
export function saveToStorage<T>(key: string, data: T): void {
  if (!isStorageAvailable()) {
    throw new StorageError(
      StorageErrorType.STORAGE_UNAVAILABLE,
      'localStorage is not available',
      key
    );
  }

  try {
    const storageItem: StorageItem<T> = {
      version: CURRENT_VERSIONS[key] || 1,
      data,
      timestamp: Date.now(),
    };
    
    const serializedData = JSON.stringify(storageItem);
    
    try {
      localStorage.setItem(key, serializedData);
    } catch (error) {
      if (error instanceof DOMException && (
        // Firefox
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        // Chrome
        error.name === 'QuotaExceededError' ||
        // Safari
        error.name === 'QUOTA_EXCEEDED_ERR'
      )) {
        throw new StorageError(
          StorageErrorType.QUOTA_EXCEEDED,
          `Storage quota exceeded for key "${key}"`,
          key,
          error as Error
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    
    throw new StorageError(
      StorageErrorType.SERIALIZATION,
      `Error saving data to storage with key "${key}"`,
      key,
      error as Error
    );
  }
}

// Apply migrations to data
function applyMigrations<T>(key: string, data: unknown, version: number): T {
  if (!migrations[key] || migrations[key].length === 0) {
    return data as T;
  }
  
  let migratedData = data;
  let currentVersion = version;
  
  for (const migration of migrations[key]) {
    if (migration.version > currentVersion) {
      migratedData = migration.migrate(migratedData, currentVersion);
      currentVersion = migration.version;
    }
  }
  
  return migratedData as T;
}

// Load data from local storage with version checking and migration
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available, using default value');
    return defaultValue;
  }
  
  try {
    const serializedData = localStorage.getItem(key);
    
    if (serializedData === null) {
      return defaultValue;
    }
    
    const parsedData = JSON.parse(serializedData);
    
    // If the data is already versioned
    if (parsedData && typeof parsedData === 'object' && 'version' in parsedData && 'data' in parsedData) {
      const storageItem = parsedData as StorageItem<unknown>;
      const currentVersion = CURRENT_VERSIONS[key] || 1;
      
      // If the version matches the current version, return the data directly
      if (storageItem.version === currentVersion) {
        return storageItem.data as T;
      }
      
      // If the version is older, apply migrations
      if (storageItem.version < currentVersion) {
        const migratedData = applyMigrations<T>(key, storageItem.data, storageItem.version);
        
        // Save the migrated data back to storage
        saveToStorage(key, migratedData);
        
        return migratedData;
      }
      
      // If the version is newer (somehow), throw an error
      if (storageItem.version > currentVersion) {
        console.warn(
          `Storage version mismatch for key "${key}": stored version ${storageItem.version} is newer than the current version ${currentVersion}. Using the newer version.`
        );
        return storageItem.data as T;
      }
    }
    
    // If the data is not versioned (legacy data), wrap it in a versioned format and save it back
    const legacyData = parsedData as T;
    saveToStorage(key, legacyData);
    
    return legacyData;
  } catch (error) {
    console.error(`Error loading data from storage with key "${key}":`, error);
    return defaultValue;
  }
}

// Remove data from local storage
export function removeFromStorage(key: string): void {
  if (!isStorageAvailable()) {
    throw new StorageError(
      StorageErrorType.STORAGE_UNAVAILABLE,
      'localStorage is not available',
      key
    );
  }
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    throw new StorageError(
      StorageErrorType.UNKNOWN,
      `Error removing data from storage with key "${key}"`,
      key,
      error as Error
    );
  }
}

// Export/import all application data
export function exportAppData(): string {
  const exportData: Record<string, unknown> = {};
  
  Object.keys(STORAGE_KEYS).forEach(key => {
    const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
    try {
      const serializedData = localStorage.getItem(storageKey);
      if (serializedData) {
        exportData[storageKey] = JSON.parse(serializedData);
      }
    } catch (error) {
      console.error(`Error exporting data for key "${storageKey}":`, error);
    }
  });
  
  return JSON.stringify(exportData);
}

// Import application data
export function importAppData(jsonData: string): void {
  try {
    const importData = JSON.parse(jsonData);
    
    Object.entries(importData).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error importing data for key "${key}":`, error);
      }
    });
  } catch (error) {
    throw new StorageError(
      StorageErrorType.DESERIALIZATION,
      'Error importing application data',
      undefined,
      error as Error
    );
  }
}

// Clear all application data
export function clearAppData(): void {
  Object.keys(STORAGE_KEYS).forEach(key => {
    const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Error clearing data for key "${storageKey}":`, error);
    }
  });
}

// Storage keys
export const STORAGE_KEYS = {
  LAYOUT_CONFIG: 'kiosk-app:layout-config', // Legacy - can be removed
  THEME_CONFIG: 'kiosk-app:theme-config',
  SETTINGS: 'kiosk-app:settings', // Legacy - can be removed
  WIDGETS: 'kiosk-app:widgets', // Legacy - can be removed
  APP_STATE: 'kiosk-app:app-state',
  CONFIG: 'kiosk-app:config', // New unified config for redesigned app
};