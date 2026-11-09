import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storageError, setStorageError] = useState(false);
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [key, value]);

  return [value, setValue, storageError] as const;
}
