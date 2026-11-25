import { useEffect, useState } from 'react';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Profile photos are kept as plain files in the app's cache folder. Every
 * upload gets a new Cloudinary URL, so a file saved for a URL never goes
 * stale: it is downloaded once and reused until the cache is cleared
 * (Android "Clear cache", reinstall, logout, or the OS reclaiming space).
 */
const avatarDir = () => new Directory(Paths.cache, 'avatars');

// The URL's tail (Cloudinary version + public id) is unique per upload, so it
// makes a stable, readable file name.
const fileFor = (url: string) =>
  new File(
    avatarDir(),
    url
      .replace(/^https?:\/\//, '')
      .replace(/\?.*$/, '')
      .replace(/[^a-z0-9.]+/gi, '_')
      .slice(-120),
  );

// One download per URL even if several screens ask at once.
const downloads = new Map<string, Promise<string>>();

async function cacheAvatar(url: string): Promise<string> {
  const file = fileFor(url);
  if (file.exists) return file.uri;

  const dir = avatarDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const saved = await File.downloadFileAsync(url, file);

  // Only the current photo is kept; earlier ones belong to replaced uploads.
  for (const entry of dir.list()) {
    if (entry instanceof File && entry.uri !== saved.uri) entry.delete();
  }
  return saved.uri;
}

/**
 * Local file URI for a profile photo, downloading it the first time.
 * Falls back to the remote URL if the download fails.
 */
export function useCachedAvatar(url: string | null | undefined) {
  const [uri, setUri] = useState<string | undefined>(() => {
    if (!url) return undefined;
    const file = fileFor(url);
    return file.exists ? file.uri : undefined;
  });

  useEffect(() => {
    if (!url) {
      setUri(undefined);
      return;
    }
    const file = fileFor(url);
    if (file.exists) {
      setUri(file.uri);
      return;
    }

    let cancelled = false;
    setUri(undefined);
    let download = downloads.get(url);
    if (!download) {
      download = cacheAvatar(url).finally(() => downloads.delete(url));
      downloads.set(url, download);
    }
    download
      .then(localUri => !cancelled && setUri(localUri))
      .catch(() => !cancelled && setUri(url));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { uri, loading: !!url && !uri };
}

/** Deletes saved profile photos (logout, account switch). */
export function clearAvatarCache() {
  const dir = avatarDir();
  if (dir.exists) dir.delete();
}
