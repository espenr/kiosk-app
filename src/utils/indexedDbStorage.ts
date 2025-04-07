/**
 * IndexedDB storage utility for persisting larger datasets
 */

// Storage error types
export enum IndexedDBErrorType {
  INITIALIZATION = 'initialization',
  TRANSACTION = 'transaction',
  SERIALIZATION = 'serialization',
  DESERIALIZATION = 'deserialization',
  NOT_FOUND = 'not_found',
  QUOTA_EXCEEDED = 'quota_exceeded',
  VERSION_MISMATCH = 'version_mismatch',
  NOT_SUPPORTED = 'not_supported',
  UNKNOWN = 'unknown',
}

// Custom storage error
export class IndexedDBError extends Error {
  type: IndexedDBErrorType;
  originalError?: Error | DOMException;

  constructor(type: IndexedDBErrorType, message: string, originalError?: Error | DOMException) {
    super(message);
    this.name = 'IndexedDBError';
    this.type = type;
    this.originalError = originalError;
  }
}

// Database configuration
interface DBConfig {
  name: string;
  version: number;
  stores: {
    name: string;
    keyPath: string;
    indices?: Array<{ name: string; keyPath: string; options?: IDBIndexParameters }>;
  }[];
}

// Default database configuration
const DEFAULT_DB_CONFIG: DBConfig = {
  name: 'kiosk-app',
  version: 1,
  stores: [
    {
      name: 'widgets',
      keyPath: 'id',
      indices: [
        { name: 'type', keyPath: 'type' },
        { name: 'updatedAt', keyPath: 'updatedAt' },
      ],
    },
    {
      name: 'settings',
      keyPath: 'id',
    },
    {
      name: 'data',
      keyPath: 'id',
      indices: [
        { name: 'type', keyPath: 'type' },
        { name: 'updatedAt', keyPath: 'updatedAt' },
      ],
    },
  ],
};

// Check if IndexedDB is supported
function isIndexedDBSupported(): boolean {
  return window && 'indexedDB' in window;
}

// Create or open database
async function openDatabase(config: DBConfig = DEFAULT_DB_CONFIG): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    throw new IndexedDBError(
      IndexedDBErrorType.NOT_SUPPORTED,
      'IndexedDB is not supported in this browser',
    );
  }
  
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(config.name, config.version);
    
    request.onerror = (event) => {
      const error = (event.target as IDBRequest).error;
      reject(
        new IndexedDBError(
          IndexedDBErrorType.INITIALIZATION,
          `Error opening database: ${error?.message || 'Unknown error'}`,
          error || undefined,
        ),
      );
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result as IDBDatabase;
      // Current version is handled by the config parameter
      // const oldVersion = event.oldVersion;
      
      // Create or update object stores
      for (const store of config.stores) {
        // If the store already exists, delete it
        if (db.objectStoreNames.contains(store.name)) {
          db.deleteObjectStore(store.name);
        }
        
        // Create the store
        const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
        
        // Create indices
        if (store.indices) {
          for (const index of store.indices) {
            objectStore.createIndex(index.name, index.keyPath, index.options);
          }
        }
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBRequest).result as IDBDatabase;
      resolve(db);
    };
  });
}

// Put data into a store
export async function putData<T extends { id: string }>(
  storeName: string,
  data: T | T[],
): Promise<string[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const items = Array.isArray(data) ? data : [data];
    const ids: string[] = [];
    
    // Add metadata to each item
    const itemsWithMetadata = items.map(item => ({
      ...item,
      updatedAt: Date.now(),
    }));
    
    return new Promise((resolve, reject) => {
      transaction.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        reject(
          new IndexedDBError(
            IndexedDBErrorType.TRANSACTION,
            `Error in transaction: ${error?.message || 'Unknown error'}`,
            error || undefined,
          ),
        );
      };
      
      transaction.oncomplete = () => {
        db.close();
        resolve(ids);
      };
      
      for (const item of itemsWithMetadata) {
        const request = store.put(item);
        
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest).result;
          ids.push(result as string);
        };
      }
    });
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      `Error putting data into store ${storeName}`,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Get data from a store by ID
export async function getData<T>(storeName: string, id: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        reject(
          new IndexedDBError(
            IndexedDBErrorType.TRANSACTION,
            `Error getting data from store ${storeName}`,
            error || undefined,
          ),
        );
      };
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as T;
        db.close();
        
        if (result === undefined) {
          resolve(null);
        } else {
          resolve(result);
        }
      };
    });
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      `Error getting data from store ${storeName}`,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Get all data from a store
export async function getAllData<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        reject(
          new IndexedDBError(
            IndexedDBErrorType.TRANSACTION,
            `Error getting all data from store ${storeName}`,
            error || undefined,
          ),
        );
      };
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as T[];
        db.close();
        resolve(result);
      };
    });
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      `Error getting all data from store ${storeName}`,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Get data from a store by index
export async function getDataByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        reject(
          new IndexedDBError(
            IndexedDBErrorType.TRANSACTION,
            `Error getting data from store ${storeName} by index ${indexName}`,
            error || undefined,
          ),
        );
      };
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as T[];
        db.close();
        resolve(result);
      };
    });
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      `Error getting data from store ${storeName} by index ${indexName}`,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Delete data from a store by ID
export async function deleteData(storeName: string, id: string): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        reject(
          new IndexedDBError(
            IndexedDBErrorType.TRANSACTION,
            `Error deleting data from store ${storeName}`,
            error || undefined,
          ),
        );
      };
      
      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      `Error deleting data from store ${storeName}`,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Clear a store
export async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        reject(
          new IndexedDBError(
            IndexedDBErrorType.TRANSACTION,
            `Error clearing store ${storeName}`,
            error || undefined,
          ),
        );
      };
      
      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      `Error clearing store ${storeName}`,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Delete the entire database
export async function deleteDatabase(name: string = DEFAULT_DB_CONFIG.name): Promise<void> {
  if (!isIndexedDBSupported()) {
    throw new IndexedDBError(
      IndexedDBErrorType.NOT_SUPPORTED,
      'IndexedDB is not supported in this browser',
    );
  }
  
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(name);
    
    request.onerror = (event) => {
      const error = (event.target as IDBRequest).error;
      reject(
        new IndexedDBError(
          IndexedDBErrorType.UNKNOWN,
          `Error deleting database ${name}`,
          error || undefined,
        ),
      );
    };
    
    request.onsuccess = () => {
      resolve();
    };
  });
}

// Export all data from all stores
export async function exportDatabase(): Promise<Record<string, unknown[]>> {
  try {
    const db = await openDatabase();
    const storeNames = Array.from(db.objectStoreNames);
    const exportData: Record<string, unknown[]> = {};
    
    for (const storeName of storeNames) {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const storeData = await new Promise<unknown[]>((resolve, reject) => {
        const request = store.getAll();
        
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          reject(
            new IndexedDBError(
              IndexedDBErrorType.TRANSACTION,
              `Error exporting data from store ${storeName}`,
              error || undefined,
            ),
          );
        };
        
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest).result;
          resolve(result);
        };
      });
      
      exportData[storeName] = storeData;
    }
    
    db.close();
    return exportData;
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      'Error exporting database',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

// Import data into all stores
export async function importDatabase(data: Record<string, unknown[]>): Promise<void> {
  try {
    const db = await openDatabase();
    const storeNames = Array.from(db.objectStoreNames);
    
    for (const storeName of storeNames) {
      if (data[storeName]) {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        // Clear the store first
        await new Promise<void>((resolve, reject) => {
          const clearRequest = store.clear();
          
          clearRequest.onerror = (event) => {
            const error = (event.target as IDBRequest).error;
            reject(
              new IndexedDBError(
                IndexedDBErrorType.TRANSACTION,
                `Error clearing store ${storeName} during import`,
                error || undefined,
              ),
            );
          };
          
          clearRequest.onsuccess = () => {
            resolve();
          };
        });
        
        // Import each item
        for (const item of data[storeName]) {
          await new Promise<void>((resolve, reject) => {
            const request = store.add(item);
            
            request.onerror = (event) => {
              const error = (event.target as IDBRequest).error;
              reject(
                new IndexedDBError(
                  IndexedDBErrorType.TRANSACTION,
                  `Error importing item into store ${storeName}`,
                  error || undefined,
                ),
              );
            };
            
            request.onsuccess = () => {
              resolve();
            };
          });
        }
      }
    }
    
    db.close();
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error;
    }
    
    throw new IndexedDBError(
      IndexedDBErrorType.UNKNOWN,
      'Error importing database',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}