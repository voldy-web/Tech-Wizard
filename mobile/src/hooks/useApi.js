import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { onDataChanged } from '../api/events';

/**
 * Load data from the API with loading / error / pull-to-refresh state.
 * Re-fetches whenever the screen regains focus (so lists update after editing elsewhere).
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);
  const lastLoad = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async (mode) => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    lastLoad.current = Date.now();
    try {
      const result = await fetcherRef.current();
      if (!alive.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { load('initial'); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when the screen regains focus (e.g. coming back from an edit screen),
  // unless a load just happened (the initial mount already fetched).
  useFocusEffect(useCallback(() => {
    if (Date.now() - lastLoad.current > 800) load('silent');
  }, [load]));

  // Any write anywhere in the app -> quietly refresh (debounced so a burst of writes causes one fetch).
  useEffect(() => {
    let t;
    const off = onDataChanged(() => { clearTimeout(t); t = setTimeout(() => load('silent'), 150); });
    return () => { off(); clearTimeout(t); };
  }, [load]);

  return {
    data, error, loading, refreshing,
    reload: () => load('initial'),
    refresh: () => load('refresh'),
    setData,
  };
}
