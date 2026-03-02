/**
 * Supabase Realtime Module
 * ========================
 * Provides live subscriptions to key tables so the UI updates
 * in real-time when data changes (from other tabs, team members, or pipeline automations).
 * 
 * Tables subscribed: deals, tasks, projects, incomes, notifications
 */

import { supabase } from './supabase';
import { toast } from '@/components/ui/Toast';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ==========================================
// TYPES
// ==========================================

type TableName = 'deals' | 'tasks' | 'projects' | 'incomes' | 'notifications';

interface RealtimeCallbacks {
  onDealChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onTaskChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onProjectChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onIncomeChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onNotificationChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
}

// ==========================================
// CHANNEL MANAGEMENT
// ==========================================

let activeChannel: RealtimeChannel | null = null;
let currentCallbacks: RealtimeCallbacks = {};

/**
 * Subscribe to realtime changes on key business tables.
 * Call this once when the app initializes (e.g., after login).
 */
export function subscribeToRealtime(callbacks: RealtimeCallbacks): () => void {
  // Cleanup existing subscription
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  currentCallbacks = callbacks;

  const channel = supabase
    .channel('verlyx-hub-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deals' },
      (payload) => {
        currentCallbacks.onDealChange?.(payload);
        showRealtimeToast('deals', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        currentCallbacks.onTaskChange?.(payload);
        showRealtimeToast('tasks', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        currentCallbacks.onProjectChange?.(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'incomes' },
      (payload) => {
        currentCallbacks.onIncomeChange?.(payload);
        showRealtimeToast('incomes', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        currentCallbacks.onNotificationChange?.(payload);
        // Show notification toast for new notifications
        const record = payload.new as any;
        if (record?.title) {
          toast.info(record.title, record.message?.slice(0, 100));
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Connected to verlyx-hub-realtime channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error — will retry');
      }
    });

  activeChannel = channel;

  // Return cleanup function
  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}

/**
 * Unsubscribe from all realtime channels
 */
export function unsubscribeFromRealtime() {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    currentCallbacks = {};
    console.log('[Realtime] Disconnected');
  }
}

// ==========================================
// TOAST NOTIFICATIONS FOR REALTIME EVENTS
// ==========================================

function showRealtimeToast(
  table: TableName,
  payload: RealtimePostgresChangesPayload<Record<string, any>>
) {
  // Only show toasts for INSERT events (new records)
  // UPDATE events happen too frequently and would be noisy
  if (payload.eventType !== 'INSERT') return;

  const record = payload.new as any;

  switch (table) {
    case 'deals':
      if (record?.name) {
        toast.info('Nuevo deal', `"${record.name}" agregado al pipeline`);
      }
      break;
    case 'tasks':
      if (record?.title) {
        toast.info('Nueva tarea', `"${record.title}" creada`);
      }
      break;
    case 'incomes':
      if (record?.description) {
        toast.info(
          'Nuevo ingreso',
          `"${record.description}" por $${(record.amount || 0).toLocaleString()}`
        );
      }
      break;
  }
}

// ==========================================
// HOOK FOR REACT COMPONENTS
// ==========================================

/**
 * Custom hook to connect Zustand stores to Realtime.
 * Use in a top-level component (e.g., MainLayout or ClientProviders).
 * 
 * Example:
 * ```
 * useRealtimeSync({
 *   onDealChange: () => fetchDeals(),
 *   onTaskChange: () => fetchTasks(),
 *   onProjectChange: () => fetchProjects(),
 *   onIncomeChange: () => fetchIncomes(),
 * });
 * ```
 */
export function createRealtimeSync(callbacks: RealtimeCallbacks): () => void {
  return subscribeToRealtime(callbacks);
}
