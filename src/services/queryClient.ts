import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { Directory, File, Paths } from 'expo-file-system';

import { ApiRequestError } from './api';
import { clearAvatarCache } from './avatarCache';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Persisted queries older than this are dropped on startup instead of shown. */
export const PERSIST_MAX_AGE = 24 * HOUR;

// Bump when a cached response shape changes; the whole persisted cache is then discarded.
// v2: journal readings now carry `questions` instead of `keyPoints`.
// v3: prices moved to Papolona pennies (cached listings and series carried dollars).
export const CACHE_BUSTER = 'v3';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fresh for a minute by default; individual queries override this.
      staleTime: MINUTE,
      // Must be at least PERSIST_MAX_AGE, or data is removed before it can be persisted.
      gcTime: PERSIST_MAX_AGE,
      // Retry network errors and server faults, never 4xx (bad input, auth, not found).
      retry: (failureCount, error) =>
        failureCount < 2 &&
        !(
          error instanceof ApiRequestError &&
          error.status >= 400 &&
          error.status < 500
        ),
    },
    mutations: { retry: false },
  },
});

// React Native has no window focus: treat "app came to the foreground" as focus,
// so stale queries refetch when the user returns to the app.
if (Platform.OS !== 'web') {
  focusManager.setEventListener(handleFocus => {
    const subscription = AppState.addEventListener('change', state =>
      handleFocus(state === 'active'),
    );
    return () => subscription.remove();
  });
}

// Key-value storage for the persister, one file per key in the cache directory.
const storageDir = () => new Directory(Paths.cache, 'query-cache');
const storageFile = (key: string) =>
  new File(storageDir(), `${encodeURIComponent(key)}.json`);

const fileStorage = {
  async getItem(key: string) {
    const file = storageFile(key);
    return file.exists ? file.text() : null;
  },
  async setItem(key: string, value: string) {
    const dir = storageDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = storageFile(key);
    if (!file.exists) file.create();
    file.write(value);
  },
  async removeItem(key: string) {
    const file = storageFile(key);
    if (file.exists) file.delete();
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: fileStorage,
  key: 'papolona-query-cache',
  // Batch writes: the cache changes often, the disk copy only needs to catch up.
  throttleTime: 1000,
});

/** Drops every cached response, in memory and on disk (logout, account switch). */
export async function clearQueryCache() {
  await queryClient.cancelQueries();
  queryClient.clear();
  await queryPersister.removeClient();
  // The saved profile photo belongs to the signed-out user too.
  clearAvatarCache();
}
