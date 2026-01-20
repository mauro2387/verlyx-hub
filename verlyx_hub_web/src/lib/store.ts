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
} from './types';
import {
  mockDocuments,
} from './mock-data';
import { auth, db } from './supabase';

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
        
        // Fallback to demo mode if Supabase fails
        if (email && password) {
          const user: User = {
            id: 'demo-1',
            email,
            name: 'Usuario Demo',
            fullName: 'Usuario Demo',
            role: 'admin',
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
    
    // Use Supabase directly
    const { data, error } = await db.contacts.getAll();
    
    if (data && data.length > 0 && !error) {
      const clients: Client[] = data.map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name || ''}`.trim(),
        firstName: c.first_name,
        lastName: c.last_name || undefined,
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        companyName: c.company || '',
        type: c.type as 'individual' | 'company',
        position: c.position || '',
        status: c.status,
        notes: c.notes || '',
        tags: c.tags || [],
        isActive: c.status === 'active',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      set({ clients, isLoading: false });
    } else {
      // No data or error - show empty state
      set({ clients: [], isLoading: false });
    }
  },
  addClient: async (data) => {
    const nameParts = data.name?.split(' ') || [];
    const { data: newContact } = await db.contacts.create({
      first_name: data.firstName || nameParts[0] || '',
      last_name: data.lastName || nameParts.slice(1).join(' ') || '',
      email: data.email,
      phone: data.phone,
      company: data.company || data.companyName,
      type: data.type || 'individual',
      position: data.position,
      notes: data.notes,
      status: data.isActive ? 'active' : 'inactive',
    });
    
    if (newContact) {
      get().fetchClients();
    } else {
      // Fallback to local add
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
    const nameParts = data.name?.split(' ') || [];
    await db.contacts.update(id, {
      first_name: data.firstName || nameParts[0],
      last_name: data.lastName || nameParts.slice(1).join(' '),
      email: data.email,
      phone: data.phone,
      company: data.company || data.companyName,
      notes: data.notes,
      status: data.isActive ? 'active' : 'inactive',
    });
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
        name: p.name,
        description: p.description || '',
        status: p.status as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
        priority: p.priority as 'low' | 'medium' | 'high' | 'critical',
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
        title: t.title,
        description: t.description || '',
        status: t.status as TaskStatus,
        priority: t.priority as 'low' | 'medium' | 'high' | 'critical',
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
      completed_at: data.status === 'DONE' ? new Date().toISOString() : null,
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
      const deals: Deal[] = data.map(d => ({
        id: d.id,
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
    await db.deals.update(dealId, { stage: newStage });
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === dealId
          ? { ...d, stage: newStage, daysInStage: 0, updatedAt: new Date().toISOString() }
          : d
      ),
    }));
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
    const stages: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
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
    description: 'Contrato estándar para prestación de servicios profesionales',
    templateType: 'contract',
    fields: [
      { name: 'clientName', label: 'Nombre del Cliente', type: 'text', required: true },
      { name: 'clientAddress', label: 'Dirección del Cliente', type: 'text', required: true },
      { name: 'serviceDescription', label: 'Descripción del Servicio', type: 'textarea', required: true },
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
      { name: 'invoiceNumber', label: 'Número de Factura', type: 'text', required: true },
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
    name: 'Cotización de Proyecto',
    description: 'Propuesta comercial y cotización de proyectos',
    templateType: 'quote',
    fields: [
      { name: 'quoteNumber', label: 'Número de Cotización', type: 'text', required: true },
      { name: 'clientName', label: 'Cliente', type: 'text', required: true },
      { name: 'projectDescription', label: 'Descripción del Proyecto', type: 'textarea', required: true },
      { name: 'deliverables', label: 'Entregables', type: 'textarea', required: true },
      { name: 'timeline', label: 'Tiempo de Entrega', type: 'text', required: true },
      { name: 'price', label: 'Precio', type: 'number', required: true },
      { name: 'validUntil', label: 'Válido Hasta', type: 'date', required: true },
    ],
    htmlContent: null,
    isActive: true,
  },
  {
    name: 'Recibo de Pago',
    description: 'Comprobante de pago recibido',
    templateType: 'receipt',
    fields: [
      { name: 'receiptNumber', label: 'Número de Recibo', type: 'text', required: true },
      { name: 'clientName', label: 'Recibido de', type: 'text', required: true },
      { name: 'concept', label: 'Concepto', type: 'text', required: true },
      { name: 'amount', label: 'Monto', type: 'number', required: true },
      { name: 'paymentMethod', label: 'Método de Pago', type: 'select', required: true, options: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'] },
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
      { name: 'reportTitle', label: 'Título del Reporte', type: 'text', required: true },
      { name: 'period', label: 'Período', type: 'text', required: true },
      { name: 'summary', label: 'Resumen Ejecutivo', type: 'textarea', required: true },
      { name: 'achievements', label: 'Logros', type: 'textarea', required: true },
      { name: 'challenges', label: 'Desafíos', type: 'textarea', required: false },
      { name: 'nextSteps', label: 'Próximos Pasos', type: 'textarea', required: false },
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
