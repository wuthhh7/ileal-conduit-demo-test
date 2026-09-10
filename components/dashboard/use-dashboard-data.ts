'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardSummary } from './types';

export function useDashboardData() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      if (response.status === 401) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error('load failed');
      setData(await response.json());
      setNeedsLogin(false);
      setError('');
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => { void load(); }, 0);
    const timer = window.setInterval(() => { void load(); }, 10_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  return { data, needsLogin, error, loading, load };
}
