'use client';

import { useEffect } from 'react';
import { ToastContainer } from '@/components/ui/Toast';
import { useAuthStore, useDealsStore, useProjectsStore, useTasksStore } from '@/lib/store';
import { subscribeToRealtime, unsubscribeFromRealtime } from '@/lib/realtime';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      unsubscribeFromRealtime();
      return;
    }

    // Connect realtime when authenticated — refetch stores on changes
    const cleanup = subscribeToRealtime({
      onDealChange: () => {
        useDealsStore.getState().fetchDeals();
      },
      onTaskChange: () => {
        useTasksStore.getState().fetchTasks();
      },
      onProjectChange: () => {
        useProjectsStore.getState().fetchProjects();
      },
    });

    return cleanup;
  }, [isAuthenticated]);

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
