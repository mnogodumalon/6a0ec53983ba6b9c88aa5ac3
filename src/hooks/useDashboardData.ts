import { useState, useEffect, useMemo, useCallback } from 'react';
import type { SchlaglochMelden } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [schlaglochMelden, setSchlaglochMelden] = useState<SchlaglochMelden[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [schlaglochMeldenData] = await Promise.all([
        LivingAppsService.getSchlaglochMelden(),
      ]);
      setSchlaglochMelden(schlaglochMeldenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [schlaglochMeldenData] = await Promise.all([
          LivingAppsService.getSchlaglochMelden(),
        ]);
        setSchlaglochMelden(schlaglochMeldenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  return { schlaglochMelden, setSchlaglochMelden, loading, error, fetchAll };
}