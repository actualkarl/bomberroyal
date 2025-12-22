import { useState, useEffect } from 'react';
import { loadAssets, LoadedAssets } from '../rendering';

// Global cache for preloaded assets
let cachedAssets: LoadedAssets | null = null;
let loadingPromise: Promise<LoadedAssets> | null = null;

export function useAssetPreload() {
  const [loading, setLoading] = useState(!cachedAssets);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedAssets) {
      setLoading(false);
      return;
    }

    if (!loadingPromise) {
      loadingPromise = loadAssets();
    }

    loadingPromise
      .then((assets) => {
        cachedAssets = assets;
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to preload assets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assets');
        setLoading(false);
      });
  }, []);

  return { loading, error, assets: cachedAssets };
}

// Get cached assets synchronously (must be preloaded first)
export function getCachedAssets(): LoadedAssets | null {
  return cachedAssets;
}

// Start preloading assets (call early in app lifecycle)
export function startAssetPreload(): void {
  if (!cachedAssets && !loadingPromise) {
    loadingPromise = loadAssets()
      .then((assets) => {
        cachedAssets = assets;
        return assets;
      })
      .catch((err) => {
        console.error('Asset preload failed:', err);
        throw err;
      });
  }
}
