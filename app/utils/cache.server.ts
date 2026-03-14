/**
 * cache.server.ts — Native in-memory TTL caching utility.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Get an item from the cache.
   * Returns null if not found or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set an item in the cache with a TTL in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiry });
  }

  /**
   * Delete an item from the cache.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all items starting with a specific prefix.
   * Useful for invalidating all data for a specific shop or customer.
   */
  invalidatePattern(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance for the admin API
export const adminCache = new Cache();
