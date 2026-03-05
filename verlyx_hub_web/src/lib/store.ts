import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Client,
  Project,
  Task,
  Deal,
  MyCompany,
  Document,
  User,
  DashboardStats,
  TaskStatus,
  DealStage,
  ContactType,
  ProjectStatus,
  Priority,
  Lead,
  LeadStatus,
  LeadSource,
  LeadActivity,
  ProspectingCampaign,
  Opportunity,
  OpportunityStage,
} from './types';
import { auth, db, supabase } from './supabase';
import { onDealStageChanged } from './pipeline';
import { toast } from '@/components/ui/Toast';

// ==================== Auth Store ====================
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  updateProfile: (data: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        // Use Supabase Auth
        const { data, error } = await auth.signIn(email, password);
        
        if (data?.user && !error) {
          // Get profile
          const profile = await auth.getProfile();
          const user: User = {
            id: data.user.id,
            email: data.user.email || email,
            name: profile.data?.full_name || email.split('@')[0],
            fullName: profile.data?.full_name || email.split('@')[0],
            role: profile.data?.role || 'admin',
          };
          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },
      logout: async () => {
        await auth.signOut();
        set({ user: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      updateProfile: (data) => set((state) => ({ 
        user: state.user ? { ...state.user, ...data } : null 
      })),
      checkAuth: async () => {
        const { data } = await auth.getSession();
        if (data?.session) {
          const profile = await auth.getProfile();
          if (profile.data) {
            set({
              user: {
                id: profile.data.id,
                email: profile.data.email,
                name: profile.data.full_name || undefined,
                fullName: profile.data.full_name || undefined,
                avatar: profile.data.avatar_url || undefined,
                role: profile.data.role,
              },
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    { name: 'auth-storage' }
  )
);

// ==================== Company Store ====================
interface CompanyState {
  companies: MyCompany[];
  selectedCompanyId: string | null;
  selectedCompany: MyCompany | null;
  isLoading: boolean;
  fetchCompanies: () => Promise<void>;
  selectCompany: (id: string) => void;
  addCompany: (company: Omit<MyCompany, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCompany: (id: string, data: Partial<MyCompany>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  getSelectedCompany: () => MyCompany | undefined;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  selectedCompanyId: null,
  selectedCompany: null,
  isLoading: false,
  fetchCompanies: async () => {
    set({ isLoading: true });
    
    // Use Supabase directly
    const { data, error } = await db.myCompanies.getAll();
    
    if (data && data.length > 0 && !error) {
      const companies = data.map(c => ({
        id: c.id,
        name: c.name,
        legalName: c.legal_name || '',
        taxId: c.tax_id || '',
        type: c.type,
        industry: c.industry || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || '',
        country: c.country || '',
        currency: c.currency || 'USD',
        primaryColor: c.primary_color || '#6366f1',
        secondaryColor: c.secondary_color,
        logoUrl: c.logo_url,
        isActive: c.is_active,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      set({ companies, isLoading: false });
      if (!get().selectedCompanyId && companies.length > 0) {
        set({ selectedCompanyId: companies[0].id, selectedCompany: companies[0] });
      }
    } else {
      // No data or error - show empty state
      set({ companies: [], isLoading: false });
    }
  },
  selectCompany: (id) => {
    const company = get().companies.find((c) => c.id === id);
    set({ selectedCompanyId: id, selectedCompany: company || null });
  },
  addCompany: async (data) => {
    const { data: newCompany } = await db.myCompanies.create({
      name: data.name,
      legal_name: data.legalName,
      type: data.type,
      tax_id: data.taxId,
      industry: data.industry,
      email: data.email,
      phone: data.phone,
      primary_color: data.primaryColor,
    });
    if (newCompany) {
      get().fetchCompanies();
    }
  },
  updateCompany: async (id, data) => {
    await db.myCompanies.update(id, {
      name: data.name,
      legal_name: data.legalName,
      type: data.type,
      email: data.email,
      phone: data.phone,
    });
    get().fetchCompanies();
  },
  deleteCompany: async (id) => {
    await db.myCompanies.delete(id);
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
    }));
  },
  getSelectedCompany: () => {
    const state = get();
    return state.companies.find((c) => c.id === state.selectedCompanyId);
  },
}));

// ==================== Clients Store ====================
interface ClientsState {
  clients: Client[];
  isLoading: boolean;
  filter: {
    search: string;
    type: string | null;
    isActive: boolean | null;
  };
  fetchClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setFilter: (filter: Partial<ClientsState['filter']>) => void;
  getFilteredClients: () => Client[];
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  isLoading: false,
  filter: {
    search: '',
    type: null,
    isActive: null,
  },
  fetchClients: async () => {
    set({ isLoading: true });
    
    // Query all contacts across all companies (consolidated view)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      const clients: Client[] = data.map((c: any) => ({
        id: c.id,
        myCompanyId: c.my_company_id || null,
        name: `${c.first_name} ${c.last_name || ''}`.trim(),
        firstName: c.first_name,
        lastName: c.last_name || undefined,
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        companyName: c.company || '',
        type: (c.type as ContactType) || null,
        position: c.position || '',
        status: c.status,
        notes: c.notes || '',
        tags: c.tags || [],
        isActive: !['inactive', 'lost'].includes(c.status),
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      set({ clients, isLoading: false });
    } else {
      console.error('[Clients] Fetch error:', error);
      set({ clients: [], isLoading: false });
    }
  },
  addClient: async (data) => {
    const companyId = data.myCompanyId || useCompanyStore.getState().selectedCompanyId;
    const nameParts = data.name?.split(' ') || [];
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        first_name: data.firstName || nameParts[0] || '',
        last_name: data.lastName || nameParts.slice(1).join(' ') || '',
        email: data.email,
        phone: data.phone,
        company: data.company || data.companyName,
        type: data.type || 'client',
        position: data.position,
        notes: data.notes,
        status: data.status || 'new',
        my_company_id: companyId,
        user_id: user?.id,
      })
      .select()
      .single();
    
    if (newContact) {
      get().fetchClients();
    } else {
      const newClient: Client = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((state) => ({ clients: [...state.clients, newClient] }));
    }
  },
  updateClient: async (id, data) => {
    // Build update payload — only include fields that were explicitly set
    const updates: Record<string, unknown> = {};
    if (data.firstName !== undefined) updates.first_name = data.firstName;
    if (data.lastName !== undefined) updates.last_name = data.lastName;
    if (data.name !== undefined) {
      const parts = data.name.split(' ');
      if (!data.firstName) updates.first_name = parts[0];
      if (!data.lastName) updates.last_name = parts.slice(1).join(' ');
    }
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.company !== undefined || data.companyName !== undefined) updates.company = data.company || data.companyName;
    if (data.position !== undefined) updates.position = data.position;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.type !== undefined) updates.type = data.type;
    if (data.tags !== undefined) updates.tags = data.tags;
    // Allow explicit status changes (e.g., 'won' → 'active')
    if (data.status !== undefined) updates.status = data.status;
    else if (data.isActive !== undefined) updates.status = data.isActive ? 'active' : 'inactive';
    
    const { error } = await supabase.from('contacts').update(updates).eq('id', id).select().single();
    if (error) {
      console.error('[updateClient] PATCH failed:', error.message, error.details, error.hint);
    }
    get().fetchClients();
  },
  deleteClient: async (id) => {
    await db.contacts.delete(id);
    set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
  },
  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
  getFilteredClients: () => {
    const { clients, filter } = get();
    return clients.filter((client) => {
      if (filter.search && !client.name.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (filter.type && client.type !== filter.type) {
        return false;
      }
      if (filter.isActive !== null && client.isActive !== filter.isActive) {
        return false;
      }
      return true;
    });
  },
}));

// ==================== Projects Store ====================
interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  filter: {
    search: string;
    status: string | null;
    priority: string | null;
    clientId: string | null;
  };
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setFilter: (filter: Partial<ProjectsState['filter']>) => void;
  getFilteredProjects: () => Project[];
  getProjectById: (id: string) => Project | undefined;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  filter: {
    search: '',
    status: null,
    priority: null,
    clientId: null,
  },
  fetchProjects: async () => {
    set({ isLoading: true });
    
    // Use Supabase directly
    const { data, error } = await db.projects.getAll();
    
    if (data && !error) {
      const projects = data.map(p => ({
        id: p.id,
        myCompanyId: (p as any).my_company_id || null,
        name: p.name,
        description: p.description || '',
        status: p.status as ProjectStatus,
        priority: p.priority as Priority,
        clientId: p.contact_id || undefined,
        startDate: p.start_date || undefined,
        endDate: p.end_date || undefined,
        dueDate: p.end_date || undefined,
        budget: p.budget || 0,
        spent: 0,
        spentAmount: 0,
        progress: p.progress,
        progressPercentage: p.progress,
        tags: p.tags || [],
        teamMembers: [],
        isArchived: p.is_archived,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      set({ projects, isLoading: false });
    } else {
      // No data or error - show empty state
      set({ projects: [], isLoading: false });
    }
  },
  addProject: async (data) => {
    const { data: newProject } = await db.projects.create({
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority as string,
      start_date: data.startDate,
      end_date: data.endDate || data.dueDate,
      budget: data.budget,
      contact_id: data.clientId || null,
      currency: 'USD',
      progress: 0,
      tags: data.tags || [],
      is_archived: false,
    });
    
    if (newProject) {
      get().fetchProjects();
    } else {
      // Fallback to local add
      const newProj: Project = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((state) => ({ projects: [...state.projects, newProj] }));
    }
  },
  updateProject: async (id, data) => {
    await db.projects.update(id, {
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority as string,
      progress: data.progress || data.progressPercentage,
      start_date: data.startDate,
      end_date: data.endDate || data.dueDate,
      budget: data.budget,
      contact_id: data.clientId,
      tags: data.tags,
      is_archived: data.isArchived,
    });
    get().fetchProjects();
  },
  deleteProject: async (id) => {
    await db.projects.delete(id);
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
  },
  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
  getFilteredProjects: () => {
    const { projects, filter } = get();
    return projects.filter((project) => {
      if (filter.search && !project.name.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (filter.status && project.status !== filter.status) {
        return false;
      }
      if (filter.priority && project.priority !== filter.priority) {
        return false;
      }
      if (filter.clientId && project.clientId !== filter.clientId) {
        return false;
      }
      return true;
    });
  },
  getProjectById: (id) => {
    return get().projects.find((p) => p.id === id);
  },
}));

// ==================== Tasks Store ====================
interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  viewMode: 'list' | 'kanban' | 'calendar';
  filter: {
    search: string;
    status: TaskStatus | null;
    priority: string | null;
    projectId: string | null;
    assignedTo: string | null;
  };
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  setViewMode: (mode: 'list' | 'kanban' | 'calendar') => void;
  setFilter: (filter: Partial<TasksState['filter']>) => void;
  getFilteredTasks: () => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  viewMode: 'kanban',
  filter: {
    search: '',
    status: null,
    priority: null,
    projectId: null,
    assignedTo: null,
  },
  fetchTasks: async () => {
    set({ isLoading: true });
    
    // Use Supabase directly
    const { data, error } = await db.tasks.getAll();
    
    if (data && data.length > 0 && !error) {
      const tasks = data.map(t => ({
        id: t.id,
        myCompanyId: (t as any).my_company_id || null,
        title: t.title,
        description: t.description || '',
        status: t.status as TaskStatus,
        priority: t.priority as Priority,
        projectId: t.project_id,
        assignedTo: t.assigned_to || undefined,
        assigneeName: undefined,
        dueDate: t.due_date || undefined,
        estimatedHours: t.estimated_hours || undefined,
        actualHours: t.actual_hours || undefined,
        tags: t.tags || [],
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
      set({ tasks, isLoading: false });
    } else {
      // No data or error - show empty state
      set({ tasks: [], isLoading: false });
    }
  },
  addTask: async (data) => {
    const { data: newTask } = await db.tasks.create({
      title: data.title,
      description: data.description,
      status: data.status as string,
      priority: data.priority as string,
      project_id: data.projectId,
      assigned_to: data.assignedTo,
      due_date: data.dueDate,
      estimated_hours: data.estimatedHours,
      actual_hours: data.actualHours || 0,
      tags: data.tags || [],
    });
    
    if (newTask) {
      get().fetchTasks();
    }
  },
  updateTask: async (id, data) => {
    await db.tasks.update(id, {
      title: data.title,
      description: data.description,
      status: data.status as string,
      priority: data.priority as string,
      project_id: data.projectId,
      due_date: data.dueDate,
      estimated_hours: data.estimatedHours,
      actual_hours: data.actualHours,
      completed_at: data.status === 'done' ? new Date().toISOString() : null,
      tags: data.tags,
    });
    get().fetchTasks();
  },
  deleteTask: async (id) => {
    await db.tasks.delete(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },
  moveTask: async (taskId, newStatus) => {
    await db.tasks.update(taskId, { status: newStatus as string });
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t
      ),
    }));
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
  getFilteredTasks: () => {
    const { tasks, filter } = get();
    return tasks.filter((task) => {
      if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (filter.status && task.status !== filter.status) {
        return false;
      }
      if (filter.priority && task.priority !== filter.priority) {
        return false;
      }
      if (filter.projectId && task.projectId !== filter.projectId) {
        return false;
      }
      if (filter.assignedTo && task.assignedTo !== filter.assignedTo) {
        return false;
      }
      return true;
    });
  },
  getTasksByStatus: (status) => {
    return get().tasks.filter((t) => t.status === status);
  },
}));

// ==================== Deals Store ====================
interface DealsState {
  deals: Deal[];
  isLoading: boolean;
  filter: {
    search: string;
    stage: DealStage | null;
    priority: string | null;
    clientId: string | null;
  };
  fetchDeals: () => Promise<void>;
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDeal: (id: string, data: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  moveDeal: (dealId: string, newStage: DealStage) => Promise<void>;
  setFilter: (filter: Partial<DealsState['filter']>) => void;
  getFilteredDeals: () => Deal[];
  getDealsByStage: (stage: DealStage) => Deal[];
  getStageStats: () => { stage: DealStage; count: number; value: number }[];
}

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  isLoading: false,
  filter: {
    search: '',
    stage: null,
    priority: null,
    clientId: null,
  },
  fetchDeals: async () => {
    set({ isLoading: true });
    
    // Use Supabase directly
    const { data, error } = await db.deals.getAll();
    
    if (data && data.length > 0 && !error) {
      const deals: Deal[] = data.map((d: any) => ({
        id: d.id,
        myCompanyId: d.my_company_id || null,
        title: d.name || '',
        name: d.name,
        description: d.description || '',
        stage: d.stage as DealStage,
        priority: 'medium' as const,
        clientId: d.contact_id || undefined,
        clientName: undefined,
        amount: d.value ?? undefined,
        value: d.value,
        currency: d.currency,
        probability: d.probability,
        expectedCloseDate: d.expected_close_date || undefined,
        closeDate: d.expected_close_date || undefined,
        daysInStage: 0,
        notes: d.notes || '',
        createdAt: d.created_at,
        updatedAt: d.updated_at || d.created_at,
      }));
      set({ deals, isLoading: false });
    } else {
      // No data or error - show empty state
      set({ deals: [], isLoading: false });
    }
  },
  addDeal: async (data) => {
    const { data: newDeal } = await db.deals.create({
      name: data.title || data.name || '',
      description: data.description,
      stage: data.stage,
      value: data.amount || data.value || 0,
      currency: data.currency || 'USD',
      probability: data.probability || 50,
      contact_id: data.clientId,
      expected_close_date: data.expectedCloseDate || data.closeDate,
    });
    
    if (newDeal) {
      get().fetchDeals();
    } else {
      // Fallback to local add
      const deal: Deal = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((state) => ({ deals: [...state.deals, deal] }));
    }
  },
  updateDeal: async (id, data) => {
    await db.deals.update(id, {
      name: data.title || data.name,
      description: data.description,
      stage: data.stage,
      value: data.amount || data.value,
      probability: data.probability,
    });
    get().fetchDeals();
  },
  deleteDeal: async (id) => {
    await db.deals.delete(id);
    set((state) => ({ deals: state.deals.filter((d) => d.id !== id) }));
  },
  moveDeal: async (dealId, newStage) => {
    const deal = get().deals.find(d => d.id === dealId);
    const oldStage = deal?.stage;

    await db.deals.update(dealId, { stage: newStage });
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === dealId
          ? { ...d, stage: newStage, daysInStage: 0, updatedAt: new Date().toISOString() }
          : d
      ),
    }));

    // Trigger pipeline automation for terminal stages
    if (deal && oldStage && oldStage !== newStage) {
      const updatedDeal = { ...deal, stage: newStage };
      // Run pipeline async â€” don't block the UI
      onDealStageChanged(updatedDeal, oldStage, newStage).catch(console.error);
    }
  },
  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
  getFilteredDeals: () => {
    const { deals, filter } = get();
    return deals.filter((deal) => {
      if (filter.search && !deal.title.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (filter.stage && deal.stage !== filter.stage) {
        return false;
      }
      if (filter.priority && deal.priority !== filter.priority) {
        return false;
      }
      if (filter.clientId && deal.clientId !== filter.clientId) {
        return false;
      }
      return true;
    });
  },
  getDealsByStage: (stage) => {
    return get().deals.filter((d) => d.stage === stage);
  },
  getStageStats: () => {
    const deals = get().deals;
    const stages: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    return stages.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage);
      return {
        stage,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
      };
    });
  },
}));

// ==================== Calendar Store ====================
export type CalendarEventType = 'meeting' | 'task' | 'reminder' | 'deadline' | 'payment' | 'call' | 'other';
export type CalendarEventStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type CalendarEventPriority = 'low' | 'medium' | 'high';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  attendees?: string[];
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  relatedType?: 'project' | 'client' | 'deal' | 'task' | '';
  relatedId?: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  currentDate: Date;
  selectedEvent: CalendarEvent | null;
  filter: {
    search: string;
    type: string | null;
    status: string | null;
    priority: string | null;
  };
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setCurrentDate: (date: Date) => void;
  setSelectedEvent: (event: CalendarEvent | null) => void;
  setFilter: (filter: Partial<CalendarState['filter']>) => void;
  getFilteredEvents: () => CalendarEvent[];
  getEventsForDate: (date: Date) => CalendarEvent[];
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  currentDate: new Date(),
  selectedEvent: null,
  filter: {
    search: '',
    type: null,
    status: null,
    priority: null,
  },
  fetchEvents: async () => {
    set({ isLoading: true });
    
    const { data, error } = await db.calendarEvents.getAll();
    
    if (data && !error) {
      const events: CalendarEvent[] = data.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || undefined,
        type: e.event_type as CalendarEventType,
        startDate: e.start_date,
        endDate: e.end_date,
        allDay: e.all_day,
        location: e.location || undefined,
        attendees: e.attendees || undefined,
        status: e.status as CalendarEventStatus,
        priority: e.priority as CalendarEventPriority,
        relatedType: (e.related_type || undefined) as 'project' | 'client' | 'deal' | 'task' | '' | undefined,
        relatedId: e.related_id || undefined,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));
      set({ events, isLoading: false });
    } else {
      set({ events: [], isLoading: false });
    }
  },
  addEvent: async (eventData) => {
    const companyId = (eventData as any).myCompanyId || useCompanyStore.getState().selectedCompanyId;
    const { data: newEvent, error } = await db.calendarEvents.create({
      title: eventData.title,
      description: eventData.description || null,
      event_type: eventData.type,
      start_date: eventData.startDate,
      end_date: eventData.endDate,
      all_day: eventData.allDay,
      location: eventData.location || null,
      attendees: eventData.attendees || null,
      status: eventData.status,
      priority: eventData.priority,
      related_type: eventData.relatedType || null,
      related_id: eventData.relatedId || null,
      my_company_id: companyId,
    });
    
    if (newEvent && !error) {
      get().fetchEvents();
    } else {
      // Fallback: add locally
      const event: CalendarEvent = {
        ...eventData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set(state => ({ events: [...state.events, event] }));
    }
  },
  updateEvent: async (id, data) => {
    const { error } = await db.calendarEvents.update(id, {
      title: data.title,
      description: data.description || null,
      event_type: data.type,
      start_date: data.startDate,
      end_date: data.endDate,
      all_day: data.allDay,
      location: data.location || null,
      attendees: data.attendees || null,
      status: data.status,
      priority: data.priority,
      related_type: data.relatedType || null,
      related_id: data.relatedId || null,
    });
    
    if (!error) {
      get().fetchEvents();
    } else {
      // Fallback: update locally
      set(state => ({
        events: state.events.map(e =>
          e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
        ),
      }));
    }
  },
  deleteEvent: async (id) => {
    const { error } = await db.calendarEvents.delete(id);
    if (!error) {
      set(state => ({ events: state.events.filter(e => e.id !== id) }));
    }
  },
  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setFilter: (filter) => set(state => ({ filter: { ...state.filter, ...filter } })),
  getFilteredEvents: () => {
    const { events, filter } = get();
    return events.filter(event => {
      if (filter.search && !event.title.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (filter.type && event.type !== filter.type) {
        return false;
      }
      if (filter.status && event.status !== filter.status) {
        return false;
      }
      if (filter.priority && event.priority !== filter.priority) {
        return false;
      }
      return true;
    });
  },
  getEventsForDate: (date) => {
    const events = get().getFilteredEvents();
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  },
}));

// ==================== Documents Store ====================
interface DocumentsState {
  documents: Document[];
  isLoading: boolean;
  currentFolder: string | null;
  filter: {
    search: string;
    folder: string | null;
  };
  fetchDocuments: () => Promise<void>;
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentFolder: (folder: string | null) => void;
  setFilter: (filter: Partial<DocumentsState['filter']>) => void;
  getFilteredDocuments: () => Document[];
  getFolders: () => string[];
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],
  isLoading: false,
  currentFolder: null,
  filter: {
    search: '',
    folder: null,
  },
  fetchDocuments: async () => {
    set({ isLoading: true });
    const { data, error } = await db.documents.getAll();
    if (error) {
      console.error('Error fetching documents:', error);
      set({ isLoading: false });
      return;
    }
    // Map snake_case to camelCase for UI compatibility
    const mappedDocs: Document[] = (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      filePath: d.file_path,
      size: d.file_size,
      mimeType: d.mime_type,
      folder: d.folder || 'General',
      tags: d.tags,
      isPublic: d.is_public,
      projectId: d.project_id,
      contactId: d.contact_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
    set({ documents: mappedDocs, isLoading: false });
  },
  addDocument: async (data) => {
    const companyId = (data as any).myCompanyId || useCompanyStore.getState().selectedCompanyId;
    // Map camelCase to snake_case for Supabase
    const docData = {
      name: data.name,
      description: data.description || null,
      file_path: data.filePath || `/documents/${data.name?.toLowerCase().replace(/\s/g, '-')}`,
      file_size: data.size || 0,
      mime_type: data.mimeType || 'application/octet-stream',
      folder: data.folder || 'General',
      tags: data.tags || null,
      is_public: data.isPublic || false,
      project_id: data.projectId || null,
      contact_id: data.contactId || null,
      my_company_id: companyId,
    };
    const { data: newDoc, error } = await db.documents.create(docData);
    if (error) {
      console.error('Error creating document:', error);
      return;
    }
    if (newDoc) {
      const mappedDoc: Document = {
        id: newDoc.id,
        name: newDoc.name,
        description: newDoc.description,
        filePath: newDoc.file_path,
        size: newDoc.file_size,
        mimeType: newDoc.mime_type,
        folder: newDoc.folder || 'General',
        tags: newDoc.tags,
        isPublic: newDoc.is_public,
        projectId: newDoc.project_id,
        contactId: newDoc.contact_id,
        createdAt: newDoc.created_at,
        updatedAt: newDoc.updated_at,
      };
      set((state) => ({ documents: [mappedDoc, ...state.documents] }));
    }
  },
  updateDocument: async (id, data) => {
    // Map camelCase to snake_case for Supabase
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.filePath !== undefined) updateData.file_path = data.filePath;
    if (data.size !== undefined) updateData.file_size = data.size;
    if (data.mimeType !== undefined) updateData.mime_type = data.mimeType;
    if (data.folder !== undefined) updateData.folder = data.folder;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;

    const { error } = await db.documents.update(id, updateData);
    if (error) {
      console.error('Error updating document:', error);
      return;
    }
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
      ),
    }));
  },
  deleteDocument: async (id) => {
    const { error } = await db.documents.delete(id);
    if (error) {
      console.error('Error deleting document:', error);
      return;
    }
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) }));
  },
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
  getFilteredDocuments: () => {
    const { documents, filter, currentFolder } = get();
    return documents.filter((doc) => {
      if (filter.search && !doc.name.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (currentFolder && doc.folder !== currentFolder) {
        return false;
      }
      if (filter.folder && doc.folder !== filter.folder) {
        return false;
      }
      return true;
    });
  },
  getFolders: () => {
    const docs = get().documents;
    const folders = new Set(docs.map((d) => d.folder).filter(Boolean) as string[]);
    return Array.from(folders);
  },
}));

// ==================== Dashboard Store ====================
interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  isLoading: false,
  fetchStats: async () => {
    set({ isLoading: true });
    
    // Use Supabase directly
    const { data, error } = await db.getDashboardStats();
    
    if (data && !error) {
      set({ 
        stats: {
          projectsTotal: data.projectsTotal || 0,
          projectsInProgress: data.projectsInProgress || 0,
          tasksTotal: data.tasksTotal || 0,
          tasksPending: data.tasksPending || 0,
          dealsTotal: data.dealsTotal || 0,
          dealsValue: data.dealsValue || 0,
          clientsTotal: data.clientsTotal || 0,
        }, 
        isLoading: false 
      });
    } else {
      // Fallback: calculate stats from stores
      set({ 
        stats: {
          projectsTotal: 0,
          projectsInProgress: 0,
          tasksTotal: 0,
          tasksPending: 0,
          dealsTotal: 0,
          dealsValue: 0,
          clientsTotal: 0,
        }, 
        isLoading: false 
      });
    }
  },
}));

// ==================== PDF Generator Store ====================
export type PdfTemplateType = 'contract' | 'invoice' | 'receipt' | 'quote' | 'report';

export interface PdfTemplate {
  id: string;
  name: string;
  description: string | null;
  templateType: PdfTemplateType;
  fields: TemplateField[];
  htmlContent: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
}

export interface GeneratedPdf {
  id: string;
  templateId: string;
  templateName: string;
  fileName: string;
  filePath: string | null;
  fileSize: number | null;
  data: Record<string, string>;
  createdAt: string;
}

interface PdfGeneratorState {
  templates: PdfTemplate[];
  generatedPdfs: GeneratedPdf[];
  isLoading: boolean;
  fetchTemplates: () => Promise<void>;
  fetchGeneratedPdfs: () => Promise<void>;
  addTemplate: (template: Omit<PdfTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, data: Partial<PdfTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  generatePdf: (templateId: string, templateName: string, data: Record<string, string>) => Promise<void>;
  deleteGeneratedPdf: (id: string) => Promise<void>;
}

// Default templates (seeded if none exist)
const defaultTemplates: Omit<PdfTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Contrato de Servicios',
    description: 'Contrato estÃ¡ndar para prestaciÃ³n de servicios profesionales',
    templateType: 'contract',
    fields: [
      { name: 'clientName', label: 'Nombre del Cliente', type: 'text', required: true },
      { name: 'clientAddress', label: 'DirecciÃ³n del Cliente', type: 'text', required: true },
      { name: 'serviceDescription', label: 'DescripciÃ³n del Servicio', type: 'textarea', required: true },
      { name: 'amount', label: 'Monto Total', type: 'number', required: true },
      { name: 'startDate', label: 'Fecha de Inicio', type: 'date', required: true },
      { name: 'endDate', label: 'Fecha de Fin', type: 'date', required: false },
    ],
    htmlContent: null,
    isActive: true,
  },
  {
    name: 'Factura Comercial',
    description: 'Factura para productos y servicios',
    templateType: 'invoice',
    fields: [
      { name: 'invoiceNumber', label: 'NÃºmero de Factura', type: 'text', required: true },
      { name: 'clientName', label: 'Cliente', type: 'text', required: true },
      { name: 'items', label: 'Conceptos', type: 'textarea', required: true },
      { name: 'subtotal', label: 'Subtotal', type: 'number', required: true },
      { name: 'tax', label: 'Impuestos (%)', type: 'number', required: true },
      { name: 'total', label: 'Total', type: 'number', required: true },
      { name: 'dueDate', label: 'Fecha de Vencimiento', type: 'date', required: true },
    ],
    htmlContent: null,
    isActive: true,
  },
  {
    name: 'CotizaciÃ³n de Proyecto',
    description: 'Propuesta comercial y cotizaciÃ³n de proyectos',
    templateType: 'quote',
    fields: [
      { name: 'quoteNumber', label: 'NÃºmero de CotizaciÃ³n', type: 'text', required: true },
      { name: 'clientName', label: 'Cliente', type: 'text', required: true },
      { name: 'projectDescription', label: 'DescripciÃ³n del Proyecto', type: 'textarea', required: true },
      { name: 'deliverables', label: 'Entregables', type: 'textarea', required: true },
      { name: 'timeline', label: 'Tiempo de Entrega', type: 'text', required: true },
      { name: 'price', label: 'Precio', type: 'number', required: true },
      { name: 'validUntil', label: 'VÃ¡lido Hasta', type: 'date', required: true },
    ],
    htmlContent: null,
    isActive: true,
  },
  {
    name: 'Recibo de Pago',
    description: 'Comprobante de pago recibido',
    templateType: 'receipt',
    fields: [
      { name: 'receiptNumber', label: 'NÃºmero de Recibo', type: 'text', required: true },
      { name: 'clientName', label: 'Recibido de', type: 'text', required: true },
      { name: 'concept', label: 'Concepto', type: 'text', required: true },
      { name: 'amount', label: 'Monto', type: 'number', required: true },
      { name: 'paymentMethod', label: 'MÃ©todo de Pago', type: 'select', required: true, options: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'] },
      { name: 'paymentDate', label: 'Fecha de Pago', type: 'date', required: true },
    ],
    htmlContent: null,
    isActive: true,
  },
  {
    name: 'Reporte Mensual',
    description: 'Reporte de actividades y resultados mensuales',
    templateType: 'report',
    fields: [
      { name: 'reportTitle', label: 'TÃ­tulo del Reporte', type: 'text', required: true },
      { name: 'period', label: 'PerÃ­odo', type: 'text', required: true },
      { name: 'summary', label: 'Resumen Ejecutivo', type: 'textarea', required: true },
      { name: 'achievements', label: 'Logros', type: 'textarea', required: true },
      { name: 'challenges', label: 'DesafÃ­os', type: 'textarea', required: false },
      { name: 'nextSteps', label: 'PrÃ³ximos Pasos', type: 'textarea', required: false },
    ],
    htmlContent: null,
    isActive: true,
  },
];

export const usePdfGeneratorStore = create<PdfGeneratorState>((set, get) => ({
  templates: [],
  generatedPdfs: [],
  isLoading: false,

  fetchTemplates: async () => {
    set({ isLoading: true });
    const { data, error } = await db.pdfTemplates.getAll();
    if (error) {
      // Table may not exist yet - silently use defaults
      // Use default templates if DB is empty or error
      const mapped = defaultTemplates.map((t, i) => ({
        ...t,
        id: `default-${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      set({ templates: mapped, isLoading: false });
      return;
    }
    if (!data || data.length === 0) {
      // Use default templates
      const mapped = defaultTemplates.map((t, i) => ({
        ...t,
        id: `default-${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      set({ templates: mapped, isLoading: false });
      return;
    }
    const mapped: PdfTemplate[] = data.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      templateType: t.template_type,
      fields: t.fields || [],
      htmlContent: t.html_content,
      isActive: t.is_active,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
    set({ templates: mapped, isLoading: false });
  },

  fetchGeneratedPdfs: async () => {
    const { data, error } = await db.generatedPdfs.getAll();
    if (error) {
      // Table may not exist yet - silently return empty
      set({ generatedPdfs: [] });
      return;
    }
    const mapped: GeneratedPdf[] = (data || []).map((p: any) => ({
      id: p.id,
      templateId: p.template_id,
      templateName: p.template_name,
      fileName: p.file_name,
      filePath: p.file_path,
      fileSize: p.file_size,
      data: p.data || {},
      createdAt: p.created_at,
    }));
    set({ generatedPdfs: mapped });
  },

  addTemplate: async (templateData) => {
    const dbData = {
      name: templateData.name,
      description: templateData.description,
      template_type: templateData.templateType,
      fields: templateData.fields,
      html_content: templateData.htmlContent,
      is_active: templateData.isActive,
    };
    const { data, error } = await db.pdfTemplates.create(dbData);
    if (error) {
      console.error('Error creating template:', error);
      return;
    }
    if (data) {
      const newTemplate: PdfTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        templateType: data.template_type,
        fields: data.fields || [],
        htmlContent: data.html_content,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      set((state) => ({ templates: [newTemplate, ...state.templates] }));
    }
  },

  updateTemplate: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.templateType) dbUpdates.template_type = updates.templateType;
    if (updates.fields) dbUpdates.fields = updates.fields;
    if (updates.htmlContent !== undefined) dbUpdates.html_content = updates.htmlContent;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { error } = await db.pdfTemplates.update(id, dbUpdates);
    if (error) {
      console.error('Error updating template:', error);
      return;
    }
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  deleteTemplate: async (id) => {
    const { error } = await db.pdfTemplates.delete(id);
    if (error) {
      console.error('Error deleting template:', error);
      return;
    }
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
  },

  generatePdf: async (templateId, templateName, data) => {
    const fileName = `${templateName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const pdfData = {
      template_id: templateId,
      template_name: templateName,
      file_name: fileName,
      file_path: null,
      file_size: null,
      data: data,
    };
    const { data: newPdf, error } = await db.generatedPdfs.create(pdfData);
    if (error) {
      console.error('Error generating PDF:', error);
      // Still add to local state for UI feedback
      const localPdf: GeneratedPdf = {
        id: `local-${Date.now()}`,
        templateId,
        templateName,
        fileName,
        filePath: null,
        fileSize: null,
        data,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ generatedPdfs: [localPdf, ...state.generatedPdfs] }));
      return;
    }
    if (newPdf) {
      const mapped: GeneratedPdf = {
        id: newPdf.id,
        templateId: newPdf.template_id,
        templateName: newPdf.template_name,
        fileName: newPdf.file_name,
        filePath: newPdf.file_path,
        fileSize: newPdf.file_size,
        data: newPdf.data || {},
        createdAt: newPdf.created_at,
      };
      set((state) => ({ generatedPdfs: [mapped, ...state.generatedPdfs] }));
    }
  },

  deleteGeneratedPdf: async (id) => {
    const { error } = await db.generatedPdfs.delete(id);
    if (error) {
      console.error('Error deleting PDF:', error);
    }
    // Remove from state regardless
    set((state) => ({ generatedPdfs: state.generatedPdfs.filter((p) => p.id !== id) }));
  },
}));

// ==================== Financial System Stores ====================
import { financial } from './supabase';
import type { Category, Account, Expense, Income, Budget, Transaction, FinancialStats } from './types';

// Categories Store
interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoriesByType: (type: 'expense' | 'income') => Category[];
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  isLoading: false,
  fetchCategories: async () => {
    set({ isLoading: true });
    const { data, error } = await financial.categories.getAll();
    
    if (data && !error) {
      const categories: Category[] = data.map((c: any) => ({
        id: c.id,
        myCompanyId: c.my_company_id,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        parentId: c.parent_id,
        isActive: c.is_active,
        createdBy: c.created_by,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      set({ categories, isLoading: false });
    } else {
      set({ categories: [], isLoading: false });
    }
  },
  addCategory: async (data) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return;
    
    const { data: newCat, error } = await financial.categories.create({
      my_company_id: companyId,
      name: data.name,
      type: data.type,
      color: data.color || null,
      icon: data.icon || null,
      parent_id: data.parentId || null,
      is_active: data.isActive ?? true,
    });
    
    if (newCat && !error) {
      get().fetchCategories();
    }
  },
  updateCategory: async (id, data) => {
    const { error } = await financial.categories.update(id, {
      name: data.name,
      type: data.type,
      color: data.color,
      icon: data.icon,
      is_active: data.isActive,
    });
    if (!error) {
      get().fetchCategories();
    }
  },
  deleteCategory: async (id) => {
    const { error } = await financial.categories.delete(id);
    if (!error) {
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    }
  },
  getCategoriesByType: (type) => {
    return get().categories.filter((c) => c.type === type && c.isActive);
  },
}));

// Accounts Store
interface AccountsState {
  accounts: Account[];
  isLoading: boolean;
  fetchAccounts: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getTotalBalance: () => number;
  getAccountById: (id: string) => Account | undefined;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  isLoading: false,
  fetchAccounts: async () => {
    set({ isLoading: true });
    const { data, error } = await financial.accounts.getAll();
    
    if (data && !error) {
      const accounts: Account[] = data.map(a => ({
        id: a.id,
        myCompanyId: a.my_company_id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        bankName: a.bank_name,
        accountNumber: a.account_number,
        initialBalance: a.initial_balance,
        currentBalance: a.current_balance,
        isActive: a.is_active,
        color: a.color,
        icon: a.icon,
        createdBy: a.created_by,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }));
      set({ accounts, isLoading: false });
    } else {
      set({ accounts: [], isLoading: false });
    }
  },
  addAccount: async (data) => {
    const companyId = data.myCompanyId || useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return;
    
    const { data: newAcc, error } = await financial.accounts.create({
      my_company_id: companyId,
      name: data.name,
      type: data.type,
      currency: data.currency || 'UYU',
      bank_name: data.bankName || null,
      account_number: data.accountNumber || null,
      initial_balance: data.initialBalance || 0,
      current_balance: data.currentBalance || data.initialBalance || 0,
      is_active: data.isActive ?? true,
      color: data.color || null,
      icon: data.icon || null,
    });
    
    if (newAcc && !error) {
      get().fetchAccounts();
    }
  },
  updateAccount: async (id, data) => {
    const { error } = await financial.accounts.update(id, {
      name: data.name,
      type: data.type,
      currency: data.currency,
      bank_name: data.bankName,
      account_number: data.accountNumber,
      is_active: data.isActive,
      color: data.color,
      icon: data.icon,
    });
    if (!error) {
      get().fetchAccounts();
    }
  },
  deleteAccount: async (id) => {
    const { error } = await financial.accounts.delete(id);
    if (!error) {
      set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) }));
    }
  },
  getTotalBalance: () => {
    return get().accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  },
  getAccountById: (id) => {
    return get().accounts.find((a) => a.id === id);
  },
}));

// Expenses Store
interface ExpensesState {
  expenses: Expense[];
  isLoading: boolean;
  filter: {
    search: string;
    categoryId: string | null;
    status: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  fetchExpenses: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setFilter: (filter: Partial<ExpensesState['filter']>) => void;
  getFilteredExpenses: () => Expense[];
  getTotalExpenses: () => number;
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  expenses: [],
  isLoading: false,
  filter: {
    search: '',
    categoryId: null,
    status: null,
    startDate: null,
    endDate: null,
  },
  fetchExpenses: async () => {
    set({ isLoading: true });
    const { filter } = get();
    
    const { data, error } = await financial.expenses.getAll(undefined, {
      startDate: filter.startDate || undefined,
      endDate: filter.endDate || undefined,
      categoryId: filter.categoryId || undefined,
      status: filter.status || undefined,
    });
    
    if (data && !error) {
      const expenses: Expense[] = data.map(e => ({
        id: e.id,
        myCompanyId: e.my_company_id,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        categoryId: e.category_id,
        category: e.category ? {
          id: e.category.id,
          myCompanyId: e.category.my_company_id,
          name: e.category.name,
          type: e.category.type,
          color: e.category.color,
          icon: e.category.icon,
          parentId: e.category.parent_id,
          isActive: e.category.is_active,
          createdBy: e.category.created_by,
          createdAt: e.category.created_at,
          updatedAt: e.category.updated_at,
        } : null,
        supplierName: e.supplier_name,
        supplierTaxId: e.supplier_tax_id,
        accountId: e.account_id,
        account: e.account ? {
          id: e.account.id,
          myCompanyId: e.account.my_company_id,
          name: e.account.name,
          type: e.account.type,
          currency: e.account.currency,
          bankName: e.account.bank_name,
          accountNumber: e.account.account_number,
          initialBalance: e.account.initial_balance,
          currentBalance: e.account.current_balance,
          isActive: e.account.is_active,
          color: e.account.color,
          icon: e.account.icon,
          createdBy: e.account.created_by,
          createdAt: e.account.created_at,
          updatedAt: e.account.updated_at,
        } : null,
        paymentMethod: e.payment_method,
        paymentDate: e.payment_date,
        invoiceNumber: e.invoice_number,
        invoiceDate: e.invoice_date,
        projectId: e.project_id,
        dealId: e.deal_id,
        attachmentUrls: e.attachment_urls,
        tags: e.tags,
        notes: e.notes,
        status: e.status,
        isRecurring: e.is_recurring,
        recurringFrequency: e.recurring_frequency,
        createdBy: e.created_by,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));
      set({ expenses, isLoading: false });
    } else {
      set({ expenses: [], isLoading: false });
    }
  },
  addExpense: async (data) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return;
    
    const { data: newExp, error } = await financial.expenses.create({
      my_company_id: companyId,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'UYU',
      category_id: data.categoryId || null,
      supplier_name: data.supplierName || null,
      supplier_tax_id: data.supplierTaxId || null,
      account_id: data.accountId || null,
      payment_method: data.paymentMethod || 'cash',
      payment_date: data.paymentDate,
      invoice_number: data.invoiceNumber || null,
      invoice_date: data.invoiceDate || null,
      project_id: data.projectId || null,
      deal_id: data.dealId || null,
      attachment_urls: data.attachmentUrls || null,
      tags: data.tags || null,
      notes: data.notes || null,
      status: data.status || 'paid',
      is_recurring: data.isRecurring || false,
      recurring_frequency: data.recurringFrequency || null,
    });
    
    if (newExp && !error) {
      get().fetchExpenses();
    }
  },
  updateExpense: async (id, data) => {
    const { error } = await financial.expenses.update(id, {
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      category_id: data.categoryId,
      supplier_name: data.supplierName,
      supplier_tax_id: data.supplierTaxId,
      account_id: data.accountId,
      payment_method: data.paymentMethod,
      payment_date: data.paymentDate,
      invoice_number: data.invoiceNumber,
      invoice_date: data.invoiceDate,
      project_id: data.projectId,
      notes: data.notes,
      status: data.status,
      is_recurring: data.isRecurring,
      recurring_frequency: data.recurringFrequency,
    });
    if (!error) {
      get().fetchExpenses();
    }
  },
  deleteExpense: async (id) => {
    const { error } = await financial.expenses.delete(id);
    if (!error) {
      set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    }
  },
  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
  getFilteredExpenses: () => {
    const { expenses, filter } = get();
    return expenses.filter((expense) => {
      if (filter.search && !expense.description.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (filter.categoryId && expense.categoryId !== filter.categoryId) {
        return false;
      }
      if (filter.status && expense.status !== filter.status) {
        return false;
      }
      return true;
    });
  },
  getTotalExpenses: () => {
    return get().expenses.reduce((sum, e) => sum + e.amount, 0);
  },
}));

// Incomes Store
interface IncomesState {
  incomes: Income[];
  isLoading: boolean;
  filter: {
    search: string;
    categoryId: string | null;
    status: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  fetchIncomes: () => Promise<void>;
  addIncome: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (id: string, data: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  markIncomePaid: (id: string, receiptUrl?: string | null, paymentMethod?: string) => Promise<boolean>;
  generateRecurringIncomes: () => Promise<number>;
  setFilter: (filter: Partial<IncomesState['filter']>) => void;
  getFilteredIncomes: () => Income[];
  getTotalIncomes: () => number;
  getPendingIncomes: () => Income[];
  getOverdueIncomes: () => Income[];
}

export const useIncomesStore = create<IncomesState>((set, get) => ({
  incomes: [],
  isLoading: false,
  filter: {
    search: '',
    categoryId: null,
    status: null,
    startDate: null,
    endDate: null,
  },
  fetchIncomes: async () => {
    set({ isLoading: true });
    const { filter } = get();
    
    const { data, error } = await financial.incomes.getAll(undefined, {
      startDate: filter.startDate || undefined,
      endDate: filter.endDate || undefined,
      categoryId: filter.categoryId || undefined,
      status: filter.status || undefined,
    });
    
    if (data && !error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const incomes: Income[] = data.map((i: any) => ({
        id: i.id,
        myCompanyId: i.my_company_id,
        description: i.description,
        amount: i.amount,
        currency: i.currency,
        categoryId: i.category_id,
        category: i.category ? {
          id: i.category.id,
          myCompanyId: i.category.my_company_id,
          name: i.category.name,
          type: i.category.type,
          color: i.category.color,
          icon: i.category.icon,
          parentId: i.category.parent_id,
          isActive: i.category.is_active,
          createdBy: i.category.created_by,
          createdAt: i.category.created_at,
          updatedAt: i.category.updated_at,
        } : null,
        clientId: i.client_id,
        clientName: i.client_name,
        accountId: i.account_id,
        account: i.account ? {
          id: i.account.id,
          myCompanyId: i.account.my_company_id,
          name: i.account.name,
          type: i.account.type,
          currency: i.account.currency,
          bankName: i.account.bank_name,
          accountNumber: i.account.account_number,
          initialBalance: i.account.initial_balance,
          currentBalance: i.account.current_balance,
          isActive: i.account.is_active,
          color: i.account.color,
          icon: i.account.icon,
          createdBy: i.account.created_by,
          createdAt: i.account.created_at,
          updatedAt: i.account.updated_at,
        } : null,
        paymentMethod: i.payment_method,
        paymentDate: i.payment_date,
        invoiceNumber: i.invoice_number,
        invoiceDate: i.invoice_date,
        projectId: i.project_id,
        dealId: i.deal_id,
        paymentLinkId: i.payment_link_id,
        attachmentUrls: i.attachment_urls,
        tags: i.tags,
        notes: i.notes,
        status: i.status,
        dueDate: i.due_date,
        isRecurring: i.is_recurring,
        recurringFrequency: i.recurring_frequency,
        recurringScheduleId: i.recurring_schedule_id || null,
        receiptUrl: i.receipt_url || null,
        receiptUploadedAt: i.receipt_uploaded_at || null,
        paidAt: i.paid_at || null,
        paymentStructure: i.payment_structure || null,
        isDevelopmentPayment: i.is_development_payment || false,
        createdBy: i.created_by,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      }));
      set({ incomes, isLoading: false });
    } else {
      set({ incomes: [], isLoading: false });
    }
  },
  addIncome: async (data) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return;
    
    const { data: newInc, error } = await financial.incomes.create({
      my_company_id: companyId,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'UYU',
      category_id: data.categoryId || null,
      client_id: data.clientId || null,
      client_name: data.clientName || null,
      account_id: data.accountId || null,
      payment_method: data.paymentMethod || 'transfer',
      payment_date: data.paymentDate || null,
      invoice_number: data.invoiceNumber || null,
      invoice_date: data.invoiceDate || null,
      project_id: data.projectId || null,
      deal_id: data.dealId || null,
      payment_link_id: data.paymentLinkId || null,
      attachment_urls: data.attachmentUrls || null,
      tags: data.tags || null,
      notes: data.notes || null,
      status: data.status || 'pending',
      due_date: data.dueDate || null,
      is_recurring: data.isRecurring || false,
      recurring_frequency: data.recurringFrequency || null,
    });
    
    if (newInc && !error) {
      get().fetchIncomes();
    }
  },
  updateIncome: async (id, data) => {
    const { error } = await financial.incomes.update(id, {
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      category_id: data.categoryId,
      client_id: data.clientId,
      client_name: data.clientName,
      account_id: data.accountId,
      payment_method: data.paymentMethod,
      payment_date: data.paymentDate,
      invoice_number: data.invoiceNumber,
      invoice_date: data.invoiceDate,
      project_id: data.projectId,
      notes: data.notes,
      status: data.status,
      due_date: data.dueDate,
      is_recurring: data.isRecurring,
      recurring_frequency: data.recurringFrequency,
    });
    if (!error) {
      get().fetchIncomes();
    }
  },
  deleteIncome: async (id) => {
    const { error } = await financial.incomes.delete(id);
    if (!error) {
      set((state) => ({ incomes: state.incomes.filter((i) => i.id !== id) }));
    }
  },
  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },
  getFilteredIncomes: () => {
    const { incomes, filter } = get();
    return incomes.filter((income) => {
      if (filter.search && !income.description.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }
      if (filter.categoryId && income.categoryId !== filter.categoryId) {
        return false;
      }
      if (filter.status && income.status !== filter.status) {
        return false;
      }
      return true;
    });
  },
  getTotalIncomes: () => {
    return get().incomes.reduce((sum, i) => sum + i.amount, 0);
  },
  getPendingIncomes: () => {
    return get().incomes.filter((i) => i.status === 'pending');
  },
  getOverdueIncomes: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().incomes.filter((i) => i.status === 'pending' && i.dueDate && i.dueDate < today);
  },
  markIncomePaid: async (id: string, receiptUrl?: string | null, paymentMethod?: string) => {
    const { data, error } = await supabase.rpc('mark_income_paid', {
      p_income_id: id,
      p_receipt_url: receiptUrl || null,
      p_payment_date: new Date().toISOString().split('T')[0],
      p_payment_method: paymentMethod || 'transfer',
    });

    if (error) {
      console.error('[Incomes] Mark paid failed:', error);
      // Fallback: direct update if RPC doesn't exist yet
      const { error: updateError } = await supabase
        .from('incomes')
        .update({
          status: 'received',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod || 'transfer',
          receipt_url: receiptUrl || null,
          receipt_uploaded_at: receiptUrl ? new Date().toISOString() : null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (updateError) {
        toast.error('Error', 'No se pudo marcar el pago como recibido.');
        return false;
      }
    }

    toast.success('Pago registrado', 'El ingreso se marcó como recibido.');
    get().fetchIncomes();
    return true;
  },
  generateRecurringIncomes: async () => {
    const { data, error } = await supabase.rpc('generate_recurring_incomes');
    if (error) {
      console.error('[Incomes] Generate recurring failed:', error);
      return 0;
    }
    const generated = Array.isArray(data) ? data.length : 0;
    if (generated > 0) {
      toast.info('Ingresos recurrentes', `Se generaron ${generated} ingreso(s) recurrente(s) pendiente(s).`);
      get().fetchIncomes();
    }
    return generated;
  },
}));

// Budgets Store
interface BudgetsState {
  budgets: Budget[];
  isLoading: boolean;
  fetchBudgets: () => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, data: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getBudgetStatus: (budgetId: string, spent: number) => { percentage: number; status: 'ok' | 'warning' | 'exceeded' };
}

export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  budgets: [],
  isLoading: false,
  fetchBudgets: async () => {
    set({ isLoading: true });
    const { data, error } = await financial.budgets.getAll();
    
    if (data && !error) {
      const budgets: Budget[] = data.map(b => ({
        id: b.id,
        myCompanyId: b.my_company_id,
        name: b.name,
        period: b.period,
        year: b.year,
        month: b.month,
        categoryId: b.category_id,
        category: b.category ? {
          id: b.category.id,
          myCompanyId: b.category.my_company_id,
          name: b.category.name,
          type: b.category.type,
          color: b.category.color,
          icon: b.category.icon,
          parentId: b.category.parent_id,
          isActive: b.category.is_active,
          createdBy: b.category.created_by,
          createdAt: b.category.created_at,
          updatedAt: b.category.updated_at,
        } : null,
        plannedAmount: b.planned_amount,
        currency: b.currency,
        isActive: b.is_active,
        alertPercentage: b.alert_percentage,
        createdBy: b.created_by,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));
      set({ budgets, isLoading: false });
    } else {
      set({ budgets: [], isLoading: false });
    }
  },
  addBudget: async (data) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return;
    
    const { data: newBudget, error } = await financial.budgets.create({
      my_company_id: companyId,
      name: data.name,
      period: data.period,
      year: data.year,
      month: data.month ?? null,
      category_id: data.categoryId || null,
      planned_amount: data.plannedAmount,
      currency: data.currency || 'UYU',
      is_active: data.isActive ?? true,
      alert_percentage: data.alertPercentage || 80,
    });
    
    if (newBudget && !error) {
      get().fetchBudgets();
    }
  },
  updateBudget: async (id, data) => {
    const { error } = await financial.budgets.update(id, {
      name: data.name,
      period: data.period,
      year: data.year,
      month: data.month,
      category_id: data.categoryId,
      planned_amount: data.plannedAmount,
      is_active: data.isActive,
      alert_percentage: data.alertPercentage,
    });
    if (!error) {
      get().fetchBudgets();
    }
  },
  deleteBudget: async (id) => {
    const { error } = await financial.budgets.delete(id);
    if (!error) {
      set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
    }
  },
  getBudgetStatus: (budgetId, spent) => {
    const budget = get().budgets.find((b) => b.id === budgetId);
    if (!budget) return { percentage: 0, status: 'ok' as const };
    
    const percentage = (spent / budget.plannedAmount) * 100;
    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    if (percentage >= 100) status = 'exceeded';
    else if (percentage >= budget.alertPercentage) status = 'warning';
    
    return { percentage, status };
  },
}));

// Financial Stats Store (for dashboard)
interface FinancialStatsState {
  stats: FinancialStats | null;
  isLoading: boolean;
  fetchStats: () => Promise<void>;
  getCashFlow: (year: number) => Promise<{ month: number; income: number; expense: number; net: number }[]>;
}

export const useFinancialStatsStore = create<FinancialStatsState>((set, get) => ({
  stats: null,
  isLoading: false,
  fetchStats: async () => {
    set({ isLoading: true });
    
    const currentYear = new Date().getFullYear();
    
    // Get P&L data (all companies consolidated)
    const { data: plData } = await financial.reports.getProfitLoss(undefined, currentYear);
    
    // Get pending/overdue incomes
    const { data: pendingIncomes } = await financial.incomes.getPendingIncomes();
    const { data: overdueIncomes } = await financial.incomes.getOverdueIncomes();
    
    // Get total balance
    const { data: totalBalance } = await financial.accounts.getTotalBalance();
    
    const pendingAmount = (pendingIncomes || []).reduce((sum, i) => sum + i.amount, 0);
    const overdueAmount = (overdueIncomes || []).reduce((sum, i) => sum + i.amount, 0);
    
    set({
      stats: {
        totalIncome: plData?.totalIncome || 0,
        totalExpense: plData?.totalExpense || 0,
        netProfit: plData?.netProfit || 0,
        profitMargin: plData?.profitMargin || 0,
        pendingIncomes: (pendingIncomes || []).length,
        pendingIncomesAmount: pendingAmount,
        overdueIncomes: (overdueIncomes || []).length,
        overdueIncomesAmount: overdueAmount,
        totalBalance: totalBalance || 0,
        monthlyData: plData?.monthlyData || [],
      },
      isLoading: false,
    });
  },
  getCashFlow: async (year) => {
    const { data } = await financial.reports.getCashFlow(undefined, year);
    return data || [];
  },
}));

// ==========================================
// CRM ADVANCED STORES
// ==========================================

import { crm } from './supabase';
import type { 
  ContactActivity, 
  ClientLeadScore, 
  ClientSegment, 
  PendingFollowUp,
  ClientCRMSummary,
  ContactActivityType,
  CommunicationDirection,
  InteractionSentiment,
} from './types';

// ==========================================
// CONTACT ACTIVITIES STORE
// ==========================================

interface ContactActivitiesState {
  activities: ContactActivity[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchActivities: (contactId?: string) => Promise<void>;
  fetchByContact: (contactId: string) => Promise<ContactActivity[]>;
  createActivity: (activity: {
    contactId: string;
    activityType: ContactActivityType;
    direction?: CommunicationDirection;
    sentiment?: InteractionSentiment;
    subject?: string;
    description?: string;
    outcome?: string;
    durationMinutes?: number;
    followUpDate?: string;
    followUpNotes?: string;
    dealId?: string;
    projectId?: string;
  }) => Promise<string | null>;
  updateActivity: (id: string, updates: Partial<ContactActivity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  markFollowUpDone: (id: string) => Promise<void>;
  
  // Quick logging
  logCall: (contactId: string, subject: string, description?: string, durationMinutes?: number, activityDate?: string) => Promise<string | null>;
  logEmail: (contactId: string, subject: string, description?: string, activityDate?: string) => Promise<string | null>;
  logMeeting: (contactId: string, subject: string, description?: string, durationMinutes?: number, activityDate?: string) => Promise<string | null>;
  logNote: (contactId: string, subject: string, description?: string, activityDate?: string) => Promise<string | null>;
}

export const useContactActivitiesStore = create<ContactActivitiesState>((set, get) => ({
  activities: [],
  isLoading: false,
  error: null,
  
  fetchActivities: async (contactId) => {
    set({ isLoading: true, error: null });
    
    const { data, error } = await crm.activities.getAll(undefined, { 
      contactId,
      limit: 100 
    });
    
    set({
      activities: data || [],
      isLoading: false,
      error: error?.message || null,
    });
  },
  
  fetchByContact: async (contactId) => {
    const { data } = await crm.activities.getByContact(undefined, contactId, 50);
    return data || [];
  },
  
  createActivity: async (activity) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;
    
    const { data: activityId, error } = await crm.activities.create({
      myCompanyId: companyId,
      ...activity,
    });
    
    if (error) {
      set({ error: error.message });
      return null;
    }
    
    // Refresh activities
    await get().fetchActivities(activity.contactId);
    return activityId;
  },
  
  updateActivity: async (id, updates) => {
    const { error } = await crm.activities.update(id, {
      activityType: updates.activityType,
      direction: updates.direction,
      sentiment: updates.sentiment || undefined,
      subject: updates.subject || undefined,
      description: updates.description || undefined,
      outcome: updates.outcome || undefined,
      durationMinutes: updates.durationMinutes || undefined,
      followUpDate: updates.followUpDate || undefined,
      followUpNotes: updates.followUpNotes || undefined,
      isFollowUpDone: updates.isFollowUpDone,
    });
    
    if (!error) {
      set(state => ({
        activities: state.activities.map(a => 
          a.id === id ? { ...a, ...updates } : a
        ),
      }));
    }
  },
  
  deleteActivity: async (id) => {
    const { error } = await crm.activities.delete(id);
    
    if (!error) {
      set(state => ({
        activities: state.activities.filter(a => a.id !== id),
      }));
    }
  },
  
  markFollowUpDone: async (id) => {
    await get().updateActivity(id, { isFollowUpDone: true });
  },
  
  // Quick logging methods
  logCall: async (contactId, subject, description, durationMinutes, activityDate) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;
    
    const { data } = await crm.activities.logCall(companyId, contactId, {
      subject,
      description,
      durationMinutes,
      ...(activityDate ? { activityDate: new Date(activityDate).toISOString() } : {}),
    });
    
    if (data) {
      await get().fetchActivities(contactId);
      // Also create calendar event so it appears in calendar
      const eventStart = activityDate ? new Date(activityDate) : new Date();
      const endDate = new Date(eventStart.getTime() + (durationMinutes || 15) * 60000);
      await db.calendarEvents.create({
        title: `📞 ${subject}`,
        description: description || null,
        event_type: 'call',
        start_date: eventStart.toISOString(),
        end_date: endDate.toISOString(),
        all_day: false,
        status: 'completed',
        priority: 'medium',
        related_type: 'client',
        related_id: contactId,
      });
    }
    return data;
  },
  
  logEmail: async (contactId, subject, description, activityDate) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;
    
    const { data } = await crm.activities.logEmail(companyId, contactId, {
      subject,
      description,
      ...(activityDate ? { activityDate: new Date(activityDate).toISOString() } : {}),
    });
    
    if (data) {
      await get().fetchActivities(contactId);
      // Also create calendar event
      const eventStart = activityDate ? new Date(activityDate) : new Date();
      const endDate = new Date(eventStart.getTime() + 15 * 60000);
      await db.calendarEvents.create({
        title: `📧 ${subject}`,
        description: description || null,
        event_type: 'other',
        start_date: eventStart.toISOString(),
        end_date: endDate.toISOString(),
        all_day: false,
        status: 'completed',
        priority: 'medium',
        related_type: 'client',
        related_id: contactId,
      });
    }
    return data;
  },
  
  logMeeting: async (contactId, subject, description, durationMinutes, activityDate) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;
    
    const { data } = await crm.activities.logMeeting(companyId, contactId, {
      subject,
      description,
      durationMinutes,
      ...(activityDate ? { activityDate: new Date(activityDate).toISOString() } : {}),
    });
    
    if (data) {
      await get().fetchActivities(contactId);
      // Also create calendar event
      const eventStart = activityDate ? new Date(activityDate) : new Date();
      const endDate = new Date(eventStart.getTime() + (durationMinutes || 60) * 60000);
      await db.calendarEvents.create({
        title: `🤝 ${subject}`,
        description: description || null,
        event_type: 'meeting',
        start_date: eventStart.toISOString(),
        end_date: endDate.toISOString(),
        all_day: false,
        status: 'confirmed',
        priority: 'medium',
        related_type: 'client',
        related_id: contactId,
      });
    }
    return data;
  },
  
  logNote: async (contactId, subject, description, activityDate) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;
    
    const { data } = await crm.activities.logNote(companyId, contactId, {
      subject,
      description,
      ...(activityDate ? { activityDate: new Date(activityDate).toISOString() } : {}),
    });
    
    if (data) await get().fetchActivities(contactId);
    return data;
  },
}));

// ==========================================
// LEAD SCORES STORE
// ==========================================

interface LeadScoresState {
  scores: ClientLeadScore[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchScores: (filters?: { temperature?: string; minScore?: number }) => Promise<void>;
  getContactScore: (contactId: string) => Promise<ClientLeadScore | null>;
  recalculateScore: (contactId: string) => Promise<number | null>;
  getHotLeads: (limit?: number) => Promise<ClientLeadScore[]>;
  
  // Helpers
  getScoreByContactId: (contactId: string) => ClientLeadScore | undefined;
  getTemperatureColor: (temperature: string) => string;
  getTemperatureLabel: (temperature: string) => string;
}

export const useLeadScoresStore = create<LeadScoresState>((set, get) => ({
  scores: [],
  isLoading: false,
  error: null,
  
  fetchScores: async (filters) => {
    set({ isLoading: true, error: null });
    
    const { data, error } = await crm.scores.getAll(undefined, filters);
    
    set({
      scores: data || [],
      isLoading: false,
      error: error?.message || null,
    });
  },
  
  getContactScore: async (contactId) => {
    const { data } = await crm.scores.getByContact(undefined, contactId);
    return data;
  },
  
  recalculateScore: async (contactId) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;
    
    const { data, error } = await crm.scores.recalculate(companyId, contactId);
    
    if (!error) {
      // Refresh scores
      await get().fetchScores();
    }
    
    return data;
  },
  
  getHotLeads: async (limit = 10) => {
    const { data } = await crm.scores.getHotLeads(undefined, limit);
    return data || [];
  },
  
  getScoreByContactId: (contactId) => {
    return get().scores.find(s => s.contactId === contactId);
  },
  
  getTemperatureColor: (temperature) => {
    const colors: Record<string, string> = {
      cold: 'bg-blue-100 text-blue-700',
      warm: 'bg-yellow-100 text-yellow-700',
      hot: 'bg-orange-100 text-orange-700',
      very_hot: 'bg-red-100 text-red-700',
    };
    return colors[temperature] || colors.cold;
  },
  
  getTemperatureLabel: (temperature) => {
    const labels: Record<string, string> = {
      cold: 'FrÃ­o',
      warm: 'Tibio',
      hot: 'Caliente',
      very_hot: 'Muy Caliente',
    };
    return labels[temperature] || 'Desconocido';
  },
}));

// ==========================================
// CLIENT SEGMENTS STORE
// ==========================================

interface ClientSegmentsState {
  segments: ClientSegment[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchSegments: () => Promise<void>;
  createSegment: (segment: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    segmentType?: 'manual' | 'dynamic' | 'smart';
    conditions?: Record<string, unknown>;
  }) => Promise<string | null>;
  updateSegment: (id: string, updates: Partial<ClientSegment>) => Promise<void>;
  deleteSegment: (id: string) => Promise<void>;
  addContactToSegment: (segmentId: string, contactId: string) => Promise<void>;
  removeContactFromSegment: (segmentId: string, contactId: string) => Promise<void>;
  getSegmentContacts: (segmentId: string) => Promise<unknown[]>;
  getContactSegments: (contactId: string) => Promise<unknown[]>;
  
  // Helpers
  getSegmentById: (id: string) => ClientSegment | undefined;
}

export const useClientSegmentsStore = create<ClientSegmentsState>((set, get) => ({
  segments: [],
  isLoading: false,
  error: null,
  
  fetchSegments: async () => {
    set({ isLoading: true, error: null });
    
    const { data, error } = await crm.segments.getAll();
    
    set({
      segments: data || [],
      isLoading: false,
      error: error?.message || null,
    });
  },
  
  createSegment: async (segment) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;
    
    const { data: segmentId, error } = await crm.segments.create({
      myCompanyId: companyId,
      ...segment,
    });
    
    if (error) {
      set({ error: error.message });
      return null;
    }
    
    await get().fetchSegments();
    return segmentId;
  },
  
  updateSegment: async (id, updates) => {
    const { error } = await crm.segments.update(id, {
      name: updates.name,
      description: updates.description || undefined,
      color: updates.color,
      icon: updates.icon,
      conditions: updates.conditions,
      isActive: updates.isActive,
    });
    
    if (!error) {
      set(state => ({
        segments: state.segments.map(s => 
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
    }
  },
  
  deleteSegment: async (id) => {
    const { error } = await crm.segments.delete(id);
    
    if (!error) {
      set(state => ({
        segments: state.segments.filter(s => s.id !== id),
      }));
    }
  },
  
  addContactToSegment: async (segmentId, contactId) => {
    await crm.segments.addContact(segmentId, contactId);
    await get().fetchSegments(); // Refresh to update counts
  },
  
  removeContactFromSegment: async (segmentId, contactId) => {
    await crm.segments.removeContact(segmentId, contactId);
    await get().fetchSegments();
  },
  
  getSegmentContacts: async (segmentId) => {
    const { data } = await crm.segments.getContacts(segmentId);
    return data || [];
  },
  
  getContactSegments: async (contactId) => {
    const { data } = await crm.segments.getContactSegments(contactId);
    return data || [];
  },
  
  getSegmentById: (id) => {
    return get().segments.find(s => s.id === id);
  },
}));

// ==========================================
// PENDING FOLLOW-UPS STORE
// ==========================================

interface PendingFollowUpsState {
  followUps: PendingFollowUp[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFollowUps: () => Promise<void>;
  markDone: (activityId: string) => Promise<void>;
  
  // Helpers
  getOverdueCount: () => number;
  getTodayCount: () => number;
  getThisWeekCount: () => number;
}

export const usePendingFollowUpsStore = create<PendingFollowUpsState>((set, get) => ({
  followUps: [],
  isLoading: false,
  error: null,
  
  fetchFollowUps: async () => {
    set({ isLoading: true, error: null });
    
    const { data, error } = await crm.activities.getPendingFollowUps();
    
    set({
      followUps: data || [],
      isLoading: false,
      error: error?.message || null,
    });
  },
  
  markDone: async (activityId) => {
    await crm.activities.markFollowUpDone(activityId);
    
    set(state => ({
      followUps: state.followUps.filter(f => f.id !== activityId),
    }));
  },
  
  getOverdueCount: () => {
    return get().followUps.filter(f => f.urgency === 'overdue').length;
  },
  
  getTodayCount: () => {
    return get().followUps.filter(f => f.urgency === 'today').length;
  },
  
  getThisWeekCount: () => {
    return get().followUps.filter(f => f.urgency === 'this_week').length;
  },
}));

// ==========================================
// CRM DASHBOARD METRICS STORE
// ==========================================

interface CRMMetricsState {
  hotLeadsCount: number;
  pendingFollowUpsCount: number;
  activitiesThisWeek: number;
  isLoading: boolean;
  
  // Actions
  fetchMetrics: () => Promise<void>;
}

export const useCRMMetricsStore = create<CRMMetricsState>((set) => ({
  hotLeadsCount: 0,
  pendingFollowUpsCount: 0,
  activitiesThisWeek: 0,
  isLoading: false,
  
  fetchMetrics: async () => {
    set({ isLoading: true });
    
    const metrics = await crm.summary.getDashboardMetrics();
    
    set({
      ...metrics,
      isLoading: false,
    });
  },
}));

// ==========================================
// LEADS STORE (Prospecting)
// ==========================================

interface LeadsState {
  leads: Lead[];
  selectedLead: Lead | null;
  activities: LeadActivity[];
  campaigns: ProspectingCampaign[];
  isLoading: boolean;
  filter: {
    status?: LeadStatus;
    source?: LeadSource;
    search?: string;
  };

  // Actions
  fetchLeads: () => Promise<void>;
  fetchLeadActivities: (leadId: string) => Promise<void>;
  fetchCampaigns: () => Promise<void>;
  createLead: (lead: Partial<Lead>) => Promise<Lead | null>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  setSelectedLead: (lead: Lead | null) => void;
  setFilter: (filter: Partial<LeadsState['filter']>) => void;
  addActivity: (activity: Partial<LeadActivity>) => Promise<void>;
  convertToOpportunity: (leadId: string) => Promise<string | null>;
  auditLead: (leadId: string) => Promise<Record<string, unknown> | null>;
  generateProposal: (leadId: string) => Promise<Record<string, unknown> | null>;
  runMarketScan: (prospects: Record<string, unknown>[], city: string, businessType: string) => Promise<Record<string, unknown> | null>;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  selectedLead: null,
  activities: [],
  campaigns: [],
  isLoading: false,
  filter: {},

  fetchLeads: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const leads: Lead[] = data.map((d: any) => ({
        id: d.id,
        myCompanyId: d.my_company_id,
        companyName: d.company_name,
        businessType: d.business_type,
        address: d.address,
        lat: d.latitude,
        lng: d.longitude,
        contactName: d.contact_name,
        contactEmail: d.contact_email,
        contactPhone: d.contact_phone,
        website: d.website,
        source: d.source,
        channel: d.contact_channel,
        status: d.status,
        prospectScore: d.prospect_score || 0,
        contactAttempts: d.total_contact_attempts || 0,
        lastContactedAt: d.last_contact_date,
        notes: d.notes,
        osmId: d.osm_id,
        osmTags: d.osm_tags,
        campaignId: d.campaign_id,
        convertedToOpportunityId: d.converted_to_opportunity_id,
        convertedAt: d.converted_at,
        convertedBy: d.converted_by,
        ownerUserId: d.owner_user_id,
        tags: d.tags || [],
        customFields: d.custom_fields || {},
        opportunityType: d.opportunity_type || null,
        digitalScore: d.digital_score || 0,
        lastAuditAt: d.last_audit_at || null,
        auditData: d.audit_data || null,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
      set({ leads, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  fetchLeadActivities: async (leadId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (data) {
      const activities: LeadActivity[] = data.map((d: any) => ({
        id: d.id,
        leadId: d.lead_id,
        activityType: d.activity_type,
        channel: d.channel,
        subject: d.subject,
        body: d.body,
        outcome: d.outcome,
        oldStatus: d.old_status,
        newStatus: d.new_status,
        performedBy: d.performed_by,
        metadata: d.metadata,
        createdAt: d.created_at,
      }));
      set({ activities });
    }
  },

  fetchCampaigns: async () => {
    const { data } = await supabase
      .from('prospecting_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const campaigns: ProspectingCampaign[] = data.map((d: any) => ({
        id: d.id,
        myCompanyId: d.my_company_id,
        name: d.name,
        description: d.description,
        status: d.status,
        searchCriteria: d.search_criteria,
        targetArea: d.target_area,
        targetBusinessTypes: d.target_business_types || [],
        emailTemplate: d.email_template,
        whatsappTemplate: d.whatsapp_template,
        totalLeads: d.total_leads || 0,
        contactedLeads: d.contacted_leads || 0,
        respondedLeads: d.responded_leads || 0,
        convertedLeads: d.converted_leads || 0,
        startDate: d.start_date,
        endDate: d.end_date,
        createdBy: d.created_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
      set({ campaigns });
    }
  },

  createLead: async (lead: Partial<Lead>) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) return null;

    const { data, error } = await supabase
      .from('leads')
      .insert({
        my_company_id: companyId,
        company_name: lead.companyName,
        business_type: lead.businessType,
        address: lead.address,
        latitude: lead.lat,
        longitude: lead.lng,
        contact_name: lead.contactName,
        contact_email: lead.contactEmail,
        contact_phone: lead.contactPhone,
        website: lead.website,
        source: lead.source || 'manual',
        contact_channel: lead.channel,
        status: lead.status || 'not_contacted',
        prospect_score: lead.prospectScore || 0,
        notes: lead.notes,
        osm_id: lead.osmId,
        osm_tags: lead.osmTags,
        campaign_id: lead.campaignId,
        owner_user_id: lead.ownerUserId,
        tags: lead.tags || [],
        custom_fields: lead.customFields || {},
      })
      .select()
      .single();

    if (!error && data) {
      const newLead: Lead = {
        id: data.id,
        myCompanyId: data.my_company_id,
        companyName: data.company_name,
        businessType: data.business_type,
        address: data.address,
        lat: data.latitude,
        lng: data.longitude,
        contactName: data.contact_name,
        contactEmail: data.contact_email,
        contactPhone: data.contact_phone,
        website: data.website,
        source: data.source,
        channel: data.contact_channel,
        status: data.status,
        prospectScore: data.prospect_score || 0,
        contactAttempts: data.total_contact_attempts || 0,
        lastContactedAt: data.last_contact_date,
        notes: data.notes,
        osmId: data.osm_id,
        osmTags: data.osm_tags,
        campaignId: data.campaign_id,
        convertedToOpportunityId: data.converted_to_opportunity_id,
        convertedAt: data.converted_at,
        convertedBy: data.converted_by,
        ownerUserId: data.owner_user_id,
        tags: data.tags || [],
        customFields: data.custom_fields || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      set(state => ({ leads: [newLead, ...state.leads] }));
      toast.success('Lead guardado', `"${newLead.companyName}" agregado a tus leads`);
      return newLead;
    }
    if (error) {
      toast.error('Error al guardar lead', error.message);
    }
    return null;
  },

  updateLead: async (id: string, updates: Partial<Lead>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
    if (updates.businessType !== undefined) dbUpdates.business_type = updates.businessType;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.lat !== undefined) dbUpdates.latitude = updates.lat;
    if (updates.lng !== undefined) dbUpdates.longitude = updates.lng;
    if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
    if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
    if (updates.website !== undefined) dbUpdates.website = updates.website;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.channel !== undefined) dbUpdates.contact_channel = updates.channel;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.prospectScore !== undefined) dbUpdates.prospect_score = updates.prospectScore;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

    const { error } = await supabase
      .from('leads')
      .update(dbUpdates)
      .eq('id', id);

    if (!error) {
      set(state => ({
        leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l),
        selectedLead: state.selectedLead?.id === id ? { ...state.selectedLead, ...updates } : state.selectedLead,
      }));
    }
  },

  deleteLead: async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) {
      set(state => ({
        leads: state.leads.filter(l => l.id !== id),
        selectedLead: state.selectedLead?.id === id ? null : state.selectedLead,
      }));
    }
  },

  setSelectedLead: (lead: Lead | null) => set({ selectedLead: lead }),

  setFilter: (filter) => set(state => ({ filter: { ...state.filter, ...filter } })),

  addActivity: async (activity: Partial<LeadActivity>) => {
    const { data } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: activity.leadId,
        activity_type: activity.activityType,
        channel: activity.channel,
        subject: activity.subject,
        body: activity.body,
        outcome: activity.outcome,
        old_status: activity.oldStatus,
        new_status: activity.newStatus,
        performed_by: activity.performedBy,
        metadata: activity.metadata,
      })
      .select()
      .single();

    if (data) {
      const newActivity: LeadActivity = {
        id: data.id,
        leadId: data.lead_id,
        activityType: data.activity_type,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        outcome: data.outcome,
        oldStatus: data.old_status,
        newStatus: data.new_status,
        performedBy: data.performed_by,
        metadata: data.metadata,
        createdAt: data.created_at,
      };
      set(state => ({ activities: [newActivity, ...state.activities] }));
    }
  },

  convertToOpportunity: async (leadId: string) => {
    const { data, error } = await supabase.rpc('convert_lead_to_opportunity', {
      p_lead_id: leadId,
      p_converted_by: useAuthStore.getState().user?.id,
    });

    if (!error && data) {
      // Refresh leads (the lead status will have changed)
      get().fetchLeads();
      return data.opportunity_id as string;
    }
    return null;
  },

  auditLead: async (leadId: string) => {
    try {
      const res = await fetch('/api/audit/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'audit-lead', leadId }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        // Update local state
        set(state => ({
          leads: state.leads.map(l =>
            l.id === leadId
              ? {
                  ...l,
                  opportunityType: data.result.opportunityType,
                  digitalScore: data.result.score,
                  lastAuditAt: data.result.auditedAt,
                  auditData: data.result,
                }
              : l
          ),
          selectedLead: state.selectedLead?.id === leadId
            ? {
                ...state.selectedLead,
                opportunityType: data.result.opportunityType,
                digitalScore: data.result.score,
                lastAuditAt: data.result.auditedAt,
                auditData: data.result,
              }
            : state.selectedLead,
        }));
        toast.success('Audit completado', `Score digital: ${data.result.score}/100 — ${data.result.opportunityType}`);
        return data.result;
      }
      if (data.error) toast.error('Error en audit', data.error);
      return null;
    } catch {
      toast.error('Error en audit', 'No se pudo conectar con el servidor');
      return null;
    }
  },

  generateProposal: async (leadId: string) => {
    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Propuesta generada', `Propuesta para "${data.lead?.name}" lista`);
        return data;
      }
      toast.error('Error', data.error || 'No se pudo generar la propuesta');
      return null;
    } catch {
      toast.error('Error', 'No se pudo conectar con el servidor');
      return null;
    }
  },

  runMarketScan: async (prospects, city, businessType) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    const userId = useAuthStore.getState().user?.id;
    if (!companyId || !userId) return null;

    try {
      const res = await fetch('/api/audit/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'market-scan',
          prospects,
          companyId,
          userId,
          city,
          businessType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Market scan completo', `${data.summary.total} negocios analizados`);
        return data;
      }
      return null;
    } catch {
      toast.error('Error', 'No se pudo ejecutar el market scan');
      return null;
    }
  },
}));

// ==========================================
// OPPORTUNITIES STORE (Sales Pipeline)
// ==========================================

interface OpportunitiesState {
  opportunities: Opportunity[];
  selectedOpportunity: Opportunity | null;
  isLoading: boolean;
  filter: {
    stage?: OpportunityStage;
    search?: string;
  };

  // Actions
  fetchOpportunities: () => Promise<void>;
  createOpportunity: (opp: Partial<Opportunity>) => Promise<Opportunity | null>;
  updateOpportunity: (id: string, data: Partial<Opportunity>) => Promise<void>;
  deleteOpportunity: (id: string) => Promise<void>;
  changeStage: (id: string, stage: OpportunityStage, stageData: Record<string, unknown>) => Promise<boolean>;
  executeOpportunityWon: (id: string) => Promise<{ projectId?: string; clientId?: string; incomeId?: string; scheduleId?: string; paymentStructure?: string } | null>;
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  setFilter: (filter: Partial<OpportunitiesState['filter']>) => void;
}

export const useOpportunitiesStore = create<OpportunitiesState>((set, get) => ({
  opportunities: [],
  selectedOpportunity: null,
  isLoading: false,
  filter: {},

  fetchOpportunities: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const opportunities: Opportunity[] = data.map((d: any) => ({
        id: d.id,
        myCompanyId: d.my_company_id,
        leadId: d.lead_id,
        clientId: d.client_id,
        organizationId: d.organization_id,
        title: d.title,
        description: d.description,
        stage: d.stage,
        stageChangedAt: d.stage_changed_at,
        daysInStage: d.days_in_stage || 0,
        priority: d.priority || 'medium',
        needDetected: d.need_detected,
        nextAction: d.next_action || '',
        nextActionDate: d.next_action_date || '',
        responsibleUserId: d.responsible_user_id,
        proposedService: d.proposed_service,
        proposalSent: d.proposal_sent || false,
        proposalDate: d.proposal_date,
        estimatedAmountMin: d.estimated_amount_min,
        estimatedAmountMax: d.estimated_amount_max,
        currency: d.currency || 'UYU',
        objections: d.objections,
        lastInteractionAt: d.last_interaction_at,
        nextInteractionDate: d.next_interaction_date,
        tentativeAmount: d.tentative_amount,
        finalAmount: d.final_amount,
        finalCurrency: d.final_currency,
        paymentType: d.payment_type,
        startDate: d.start_date,
        wonReason: d.won_reason,
        wonAt: d.won_at,
        lostReason: d.lost_reason,
        lostNote: d.lost_note,
        lostAt: d.lost_at,
        probability: d.probability || 0,
        expectedRevenue: d.expected_revenue,
        ownerUserId: d.owner_user_id,
        assignedUsers: d.assigned_users || [],
        source: d.source,
        sourceDetails: d.source_details,
        tags: d.tags || [],
        customFields: d.custom_fields || {},
        isActive: d.is_active !== false,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
      set({ opportunities, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  createOpportunity: async (opp: Partial<Opportunity>) => {
    const companyId = useCompanyStore.getState().selectedCompanyId;
    if (!companyId) {
      toast.error('Error', 'No hay empresa activa seleccionada. Seleccioná una empresa primero.');
      return null;
    }

    // MVOR — Minimum Viable Opportunity Record defaults
    const title = opp.title?.trim() || `Oportunidad ${new Date().toLocaleDateString('es')}`;
    const nextAction = opp.nextAction?.trim() || 'Definir próximo paso';
    const nextActionDate = opp.nextActionDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        my_company_id: companyId,
        lead_id: opp.leadId,
        client_id: opp.clientId,
        organization_id: opp.organizationId,
        title,
        description: opp.description,
        stage: opp.stage || 'qualified',
        priority: opp.priority || 'medium',
        need_detected: opp.needDetected,
        next_action: nextAction,
        next_action_date: nextActionDate,
        responsible_user_id: opp.responsibleUserId,
        currency: opp.currency || 'UYU',
        owner_user_id: opp.ownerUserId || useAuthStore.getState().user?.id,
        source: opp.source,
        tags: opp.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('[Opportunities] Insert failed:', error);
      toast.error('Error al crear oportunidad', error.message || 'Verificá que tu usuario tenga permisos.');
      return null;
    }

    if (data) {
      const newOpp: Opportunity = {
        id: data.id,
        myCompanyId: data.my_company_id,
        title: data.title,
        description: data.description,
        stage: data.stage,
        stageChangedAt: data.stage_changed_at,
        daysInStage: 0,
        priority: data.priority || 'medium',
        nextAction: data.next_action || '',
        nextActionDate: data.next_action_date || '',
        proposalSent: false,
        currency: data.currency || 'UYU',
        probability: data.probability || 0,
        isActive: true,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      set(state => ({ opportunities: [newOpp, ...state.opportunities] }));
      toast.success('Oportunidad creada', `"${newOpp.title}" agregada al pipeline`);
      return newOpp;
    }
    return null;
  },

  updateOpportunity: async (id: string, updates: Partial<Opportunity>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.needDetected !== undefined) dbUpdates.need_detected = updates.needDetected;
    if (updates.nextAction !== undefined) dbUpdates.next_action = updates.nextAction;
    if (updates.nextActionDate !== undefined) dbUpdates.next_action_date = updates.nextActionDate;
    if (updates.proposedService !== undefined) dbUpdates.proposed_service = updates.proposedService;
    if (updates.proposalSent !== undefined) dbUpdates.proposal_sent = updates.proposalSent;
    if (updates.proposalDate !== undefined) dbUpdates.proposal_date = updates.proposalDate;
    if (updates.estimatedAmountMin !== undefined) dbUpdates.estimated_amount_min = updates.estimatedAmountMin;
    if (updates.estimatedAmountMax !== undefined) dbUpdates.estimated_amount_max = updates.estimatedAmountMax;
    if (updates.tentativeAmount !== undefined) dbUpdates.tentative_amount = updates.tentativeAmount;
    if (updates.finalAmount !== undefined) dbUpdates.final_amount = updates.finalAmount;
    if (updates.finalCurrency !== undefined) dbUpdates.final_currency = updates.finalCurrency;
    if (updates.paymentType !== undefined) dbUpdates.payment_type = updates.paymentType;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.wonReason !== undefined) dbUpdates.won_reason = updates.wonReason;
    if (updates.lostReason !== undefined) dbUpdates.lost_reason = updates.lostReason;
    if (updates.lostNote !== undefined) dbUpdates.lost_note = updates.lostNote;
    if (updates.nextInteractionDate !== undefined) dbUpdates.next_interaction_date = updates.nextInteractionDate;
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

    const { error } = await supabase
      .from('opportunities')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('[Opportunities] Update failed:', error);
      toast.error('Error al actualizar', error.message || 'No se pudo guardar los cambios.');
      return;
    }

    // Refresh from DB after update to get trigger-computed values
    get().fetchOpportunities();
  },

  deleteOpportunity: async (id: string) => {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id);

    if (!error) {
      set(state => ({
        opportunities: state.opportunities.filter(o => o.id !== id),
        selectedOpportunity: state.selectedOpportunity?.id === id ? null : state.selectedOpportunity,
      }));
    }
  },

  changeStage: async (id: string, stage: OpportunityStage, stageData: Record<string, unknown>) => {
    const dbUpdates: Record<string, unknown> = { stage, ...stageData };

    const { error } = await supabase
      .from('opportunities')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('[Opportunities] Stage change failed:', error);
      // Parse DB trigger validation errors for user-friendly messages
      const msg = error.message || '';
      if (msg.includes('proposed_service')) {
        toast.error('Faltan datos', 'La etapa Propuesta requiere un servicio propuesto.');
      } else if (msg.includes('next_interaction_date')) {
        toast.error('Faltan datos', 'La etapa Negociación requiere fecha de próximo contacto.');
      } else if (msg.includes('final_amount')) {
        toast.error('Faltan datos', 'La etapa Ganada requiere monto final > 0.');
      } else if (msg.includes('final_currency')) {
        toast.error('Faltan datos', 'La etapa Ganada requiere moneda final.');
      } else if (msg.includes('payment_type')) {
        toast.error('Faltan datos', 'La etapa Ganada requiere tipo de pago.');
      } else if (msg.includes('start_date')) {
        toast.error('Faltan datos', 'La etapa Ganada requiere fecha de inicio.');
      } else if (msg.includes('lost_reason')) {
        toast.error('Faltan datos', 'La etapa Perdida requiere motivo de pérdida.');
      } else {
        toast.error('Error al cambiar etapa', msg);
      }
      return false;
    }

    // Refresh after stage change (trigger updates probability, stage_changed_at, etc.)
    await get().fetchOpportunities();
    return true;
  },

  executeOpportunityWon: async (id: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      toast.error('Error', 'No hay sesión activa.');
      return null;
    }

    const { data, error } = await supabase.rpc('execute_opportunity_won', {
      p_opportunity_id: id,
      p_user_id: userId,
    });

    if (error) {
      console.error('[Opportunities] Won execution failed:', error);
      // Show the actual error so the user can report it
      const errorDetail = error.message || error.details || 'Error desconocido';
      toast.error('Error en automatización', `No se pudo crear cliente/proyecto: ${errorDetail}`);
      return null;
    }

    if (data) {
      const paymentMsg = data.payment_structure === 'dev_plus_maintenance'
        ? 'Cobro de desarrollo + mantenimiento recurrente configurado.'
        : data.payment_structure === 'recurring'
        ? 'Plan de cobro recurrente configurado.'
        : 'Ingreso registrado.';
      toast.success('Oportunidad ganada', `Cliente actualizado, proyecto creado. ${paymentMsg}`);

      // Refresh clients store so the new/updated client appears immediately
      try { useClientsStore.getState().fetchClients(); } catch (_) {}

      return {
        projectId: data.project_id,
        clientId: data.client_id,
        incomeId: data.income_id || data.dev_income_id,
        scheduleId: data.schedule_id,
        paymentStructure: data.payment_structure,
      };
    }
    return null;
  },

  setSelectedOpportunity: (opp: Opportunity | null) => set({ selectedOpportunity: opp }),

  setFilter: (filter) => set(state => ({ filter: { ...state.filter, ...filter } })),
}));
