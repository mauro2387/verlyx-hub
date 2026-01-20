'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from './supabase';

// Generic hook for Supabase data fetching
function useSupabaseData<T>(
  fetchFn: () => Promise<{ data: T | null; error: { message: string } | null }>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchFn();
    if (result.error) {
      setError(result.error.message);
    } else {
      setData(result.data);
    }
    setLoading(false);
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch, setData };
}

// ==========================================
// PROJECTS HOOKS
// ==========================================
export function useProjects() {
  return useSupabaseData(
    () => db.projects.getAll(),
    []
  );
}

export function useProject(id: string) {
  return useSupabaseData(
    () => db.projects.getById(id),
    [id]
  );
}

export function useProjectMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (data: Parameters<typeof db.projects.create>[0]) => {
    setLoading(true);
    setError(null);
    const result = await db.projects.create(data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const updateProject = async (id: string, data: Parameters<typeof db.projects.update>[1]) => {
    setLoading(true);
    setError(null);
    const result = await db.projects.update(id, data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const deleteProject = async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await db.projects.delete(id);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  return { createProject, updateProject, deleteProject, loading, error };
}

// ==========================================
// TASKS HOOKS
// ==========================================
export function useTasks() {
  return useSupabaseData(
    () => db.tasks.getAll(),
    []
  );
}

export function useTask(id: string) {
  return useSupabaseData(
    () => db.tasks.getById(id),
    [id]
  );
}

export function useTaskMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async (data: Parameters<typeof db.tasks.create>[0]) => {
    setLoading(true);
    setError(null);
    const result = await db.tasks.create(data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const updateTask = async (id: string, data: Parameters<typeof db.tasks.update>[1]) => {
    setLoading(true);
    setError(null);
    const result = await db.tasks.update(id, data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const updateTaskStatus = async (id: string, status: string) => {
    setLoading(true);
    setError(null);
    const result = await db.tasks.update(id, { status });
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const deleteTask = async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await db.tasks.delete(id);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  return { createTask, updateTask, updateTaskStatus, deleteTask, loading, error };
}

// ==========================================
// CONTACTS HOOKS
// ==========================================
export function useContacts() {
  return useSupabaseData(
    () => db.contacts.getAll(),
    []
  );
}

export function useContact(id: string) {
  return useSupabaseData(
    () => db.contacts.getById(id),
    [id]
  );
}

export function useContactMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContact = async (data: Parameters<typeof db.contacts.create>[0]) => {
    setLoading(true);
    setError(null);
    const result = await db.contacts.create(data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const updateContact = async (id: string, data: Parameters<typeof db.contacts.update>[1]) => {
    setLoading(true);
    setError(null);
    const result = await db.contacts.update(id, data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const deleteContact = async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await db.contacts.delete(id);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  return { createContact, updateContact, deleteContact, loading, error };
}

// ==========================================
// DEALS HOOKS
// ==========================================
export function useDeals() {
  return useSupabaseData(
    () => db.deals.getAll(),
    []
  );
}

export function useDeal(id: string) {
  return useSupabaseData(
    () => db.deals.getById(id),
    [id]
  );
}

export function useDealMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDeal = async (data: Parameters<typeof db.deals.create>[0]) => {
    setLoading(true);
    setError(null);
    const result = await db.deals.create(data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const updateDeal = async (id: string, data: Parameters<typeof db.deals.update>[1]) => {
    setLoading(true);
    setError(null);
    const result = await db.deals.update(id, data);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const updateDealStage = async (id: string, stage: string) => {
    setLoading(true);
    setError(null);
    const result = await db.deals.update(id, { stage });
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  const deleteDeal = async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await db.deals.delete(id);
    setLoading(false);
    if (result.error) setError(result.error.message);
    return result;
  };

  return { createDeal, updateDeal, updateDealStage, deleteDeal, loading, error };
}

// ==========================================
// PAYMENTS HOOKS
// ==========================================
export function usePaymentLinks() {
  return useSupabaseData(
    () => db.paymentLinks.getAll(),
    []
  );
}

export function useSubscriptions() {
  return useSupabaseData(
    () => db.subscriptions.getAll(),
    []
  );
}

// ==========================================
// COMPANIES HOOKS
// ==========================================
export function useCompanies() {
  return useSupabaseData(
    () => db.myCompanies.getAll(),
    []
  );
}

export function useMyCompanies() {
  return useSupabaseData(
    () => db.myCompanies.getAll(),
    []
  );
}

export function useCompany(id: string) {
  return useSupabaseData(
    () => db.myCompanies.getById(id),
    [id]
  );
}
