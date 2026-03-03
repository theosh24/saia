interface CacheEntry {
  owner: string;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = parseInt(process.env.OWNERSHIP_CACHE_TTL || "600", 10) * 1000;

export function getCachedOwner(mint: string): string | null {
  const entry = cache.get(mint);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(mint);
    return null;
  }
  return entry.owner;
}

export function setCachedOwner(mint: string, owner: string): void {
  cache.set(mint, {
    owner,
    expiry: Date.now() + DEFAULT_TTL,
  });
}

export function invalidateCache(mint: string): void {
  cache.delete(mint);
}
