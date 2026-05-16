'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === 'dark';

  return {
    border: dark ? '#2a2a2a' : '#e5e7eb',
    mutedForeground: dark ? '#888' : '#9ca3af',
    primary: dark ? '#ffffff' : '#111111',
    green: dark ? '#34d399' : '#10b981',
  };
}
