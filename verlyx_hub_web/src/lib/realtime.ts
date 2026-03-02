/**
 * Supabase Realtime Module
 * ========================
 * Provides live subscriptions to key tables so the UI updates
 * in real-time when data changes (from other tabs, team members, or pipeline automations).
 * 
 * Tables subscribed: opportunities, leads, tasks, projects
 */

import { supabase } from './supabase';
import { toast } from '@/components/ui/Toast';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ==========================================
// TYPES
// ==========================================

type TableName = 'opportunities' | 'leads' | 'tasks' | 'projects';

interface RealtimeCallbacks {
  onOpportunityChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onLeadChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onTaskChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
  onProjectChange?: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void;
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
      { event: '*', schema: 'public', table: 'opportunities' },
      (payload) => {
        currentCallbacks.onOpportunityChange?.(payload);
        showRealtimeToast('opportunities', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => {
        currentCallbacks.onLeadChange?.(payload);
        showRealtimeToast('leads', payload);
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
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Connected to verlyx-hub-realtime channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Channel error — ensure Realtime replication is enabled for subscribed tables in Supabase Dashboard');
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
    case 'opportunities':
      if (record?.title) {
        toast.info('Nueva oportunidad', `"${record.title}" agregada al pipeline`);
      }
      break;
    case 'leads':
      if (record?.company_name) {
        toast.info('Nuevo lead', `"${record.company_name}" agregado`);
      }
      break;
    case 'tasks':
      if (record?.title) {
        toast.info('Nueva tarea', `"${record.title}" creada`);
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
 *   onOpportunityChange: () => fetchOpportunities(),
 *   onLeadChange: () => fetchLeads(),
 *   onTaskChange: () => fetchTasks(),
 *   onProjectChange: () => fetchProjects(),
 * });
 * ```
 */
export function createRealtimeSync(callbacks: RealtimeCallbacks): () => void {
  return subscribeToRealtime(callbacks);
}
