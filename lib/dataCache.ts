type Entry<T> = { data: T; fetchedAt: number };
const _store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): Entry<T> | null {
  return (_store.get(key) as Entry<T>) ?? null;
}

export function cacheSet<T>(key: string, data: T): void {
  _store.set(key, { data, fetchedAt: Date.now() });
}

export function cacheClear(key?: string): void {
  if (key !== undefined) _store.delete(key);
  else _store.clear();
}

export function getLastFetchedAt(key: string): number | null {
  return _store.get(key)?.fetchedAt ?? null;
}
