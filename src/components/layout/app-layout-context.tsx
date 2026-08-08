'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface AppLayoutContextValue {
  sidebarOpen: boolean;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function AppLayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const value = useMemo(() => ({
    sidebarOpen,
    closeSidebar: () => setSidebarOpen(false),
    toggleSidebar: () => setSidebarOpen((open) => !open),
  }), [sidebarOpen]);

  return <AppLayoutContext.Provider value={value}>{children}</AppLayoutContext.Provider>;
}

export function useAppLayout() {
  const context = useContext(AppLayoutContext);
  if (!context) throw new Error('useAppLayout must be used within AppLayoutProvider');
  return context;
}
