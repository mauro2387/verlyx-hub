import { createClient } from '@supabase/supabase-js';

// Environment variables for Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Configúralas en .env.local');
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// ==========================================
// DATABASE TYPES
// ==========================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'staff' | 'readonly';
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MyCompany {
  id: string;
  user_id: string;
  name: string;
  legal_name: string | null;
  type: string;
  tax_id: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  primary_color: string;
  secondary_color: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  type: string;
  status: string;
  source: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  tags: string[] | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  user_id: string;
  contact_id: string | null;
  name: string;
  description: string | null;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  my_company_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  name: string;
  description: string | null;
  project_type: string;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  progress: number;
  tags: string[] | null;
  metadata: Record<string, unknown>;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentLink {
  id: string;
  user_id: string;
  project_id: string | null;
  contact_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  mercadopago_link_id: string | null;
  link_url: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  contact_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  mercadopago_preapproval_id: string | null;
  status: string;
  start_date: string | null;
  next_billing_date: string | null;
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  project_id: string | null;
  contact_id: string | null;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  folder: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  location: string | null;
  attendees: string[] | null;
  status: string;
  priority: string;
  related_type: string | null;
  related_id: string | null;
  my_company_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string | null;
  context_type: string | null;
  context_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number | null;
  model: string | null;
  created_at: string;
}

export interface PdfTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template_type: 'contract' | 'invoice' | 'receipt' | 'quote' | 'report';
  fields: TemplateField[];
  html_content: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  user_id: string;
  template_id: string;
  template_name: string;
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  data: Record<string, string>;
  created_at: string;
}

// ==========================================
// AUTH HELPERS
// ==========================================

export const auth = {
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
      },
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { data: data as Profile | null, error };
  },

  async updateProfile(updates: Partial<Profile>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    return { data: data as Profile | null, error };
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ==========================================
// DATABASE HELPERS
// ==========================================

export const db = {
  // My Companies
  myCompanies: {
    async getAll() {
      const { data, error } = await supabase
        .from('my_companies')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as MyCompany[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('my_companies')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as MyCompany | null, error };
    },
    async create(company: Partial<MyCompany>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('my_companies')
        .insert({ ...company, user_id: user?.id })
        .select()
        .single();
      return { data: data as MyCompany | null, error };
    },
    async update(id: string, updates: Partial<MyCompany>) {
      const { data, error } = await supabase
        .from('my_companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as MyCompany | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('my_companies')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Contacts
  contacts: {
    async getAll() {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as Contact[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as Contact | null, error };
    },
    async create(contact: Partial<Contact>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, user_id: user?.id })
        .select()
        .single();
      return { data: data as Contact | null, error };
    },
    async update(id: string, updates: Partial<Contact>) {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Contact | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Deals
  deals: {
    async getAll() {
      const { data, error } = await supabase
        .from('deals')
        .select('*, contact:contacts(*)')
        .order('created_at', { ascending: false });
      return { data: data as Deal[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('deals')
        .select('*, contact:contacts(*)')
        .eq('id', id)
        .single();
      return { data: data as Deal | null, error };
    },
    async create(deal: Partial<Deal>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('deals')
        .insert({ ...deal, user_id: user?.id })
        .select()
        .single();
      return { data: data as Deal | null, error };
    },
    async update(id: string, updates: Partial<Deal>) {
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Deal | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Projects
  projects: {
    async getAll() {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as Project[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as Project | null, error };
    },
    async create(project: Partial<Project>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...project, user_id: user?.id })
        .select()
        .single();
      return { data: data as Project | null, error };
    },
    async update(id: string, updates: Partial<Project>) {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Project | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Tasks
  tasks: {
    async getAll(projectId?: string) {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      return { data: data as Task[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as Task | null, error };
    },
    async create(task: Partial<Task>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...task, user_id: user?.id })
        .select()
        .single();
      return { data: data as Task | null, error };
    },
    async update(id: string, updates: Partial<Task>) {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Task | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Payment Links
  paymentLinks: {
    async getAll() {
      const { data, error } = await supabase
        .from('payment_links')
        .select('*, contact:contacts(*)')
        .order('created_at', { ascending: false });
      return { data: data as PaymentLink[] | null, error };
    },
    async create(link: Partial<PaymentLink>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('payment_links')
        .insert({ ...link, user_id: user?.id })
        .select()
        .single();
      return { data: data as PaymentLink | null, error };
    },
    async update(id: string, updates: Partial<PaymentLink>) {
      const { data, error } = await supabase
        .from('payment_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as PaymentLink | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('payment_links')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Subscriptions
  subscriptions: {
    async getAll() {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, contact:contacts(*)')
        .order('created_at', { ascending: false });
      return { data: data as Subscription[] | null, error };
    },
    async create(sub: Partial<Subscription>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({ ...sub, user_id: user?.id })
        .select()
        .single();
      return { data: data as Subscription | null, error };
    },
    async update(id: string, updates: Partial<Subscription>) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Subscription | null, error };
    },
  },

  // Recurring Payment Schedules
  recurringSchedules: {
    async getAll() {
      const { data, error } = await supabase
        .from('recurring_payment_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      return { data, error };
    },
    async getByClientId(clientId: string) {
      const { data, error } = await supabase
        .from('recurring_payment_schedules')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      return { data, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('recurring_payment_schedules')
        .select('*')
        .eq('id', id)
        .single();
      return { data, error };
    },
    async update(id: string, updates: Record<string, unknown>) {
      const { data, error } = await supabase
        .from('recurring_payment_schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    },
    async create(schedule: Record<string, unknown>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('recurring_payment_schedules')
        .insert({ ...schedule, created_by: user?.id })
        .select()
        .single();
      return { data, error };
    },
  },

  // Documents
  documents: {
    async getAll(folder?: string) {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (folder) {
        query = query.eq('folder', folder);
      }
      
      const { data, error } = await query;
      return { data: data as Document[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as Document | null, error };
    },
    async create(doc: Partial<Document>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('documents')
        .insert({ ...doc, user_id: user?.id })
        .select()
        .single();
      return { data: data as Document | null, error };
    },
    async update(id: string, doc: Partial<Document>) {
      const { data, error } = await supabase
        .from('documents')
        .update({ ...doc, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return { data: data as Document | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Notifications
  notifications: {
    async getAll() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return { data: data as Notification[] | null, error };
    },
    async getUnread() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      return { data: data as Notification[] | null, error };
    },
    async markAsRead(id: string) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      return { error };
    },
    async markAllAsRead() {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('is_read', false);
      return { error };
    },
  },

  // Calendar Events
  calendarEvents: {
    async getAll() {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: true });
      return { data: data as CalendarEvent[] | null, error };
    },
    async getByDateRange(startDate: string, endDate: string) {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: true });
      return { data: data as CalendarEvent[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as CalendarEvent | null, error };
    },
    async create(event: Partial<CalendarEvent>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({ ...event, user_id: user?.id })
        .select()
        .single();
      return { data: data as CalendarEvent | null, error };
    },
    async update(id: string, updates: Partial<CalendarEvent>) {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return { data: data as CalendarEvent | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // PDF Templates
  pdfTemplates: {
    async getAll() {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as PdfTemplate[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as PdfTemplate | null, error };
    },
    async create(template: Partial<PdfTemplate>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('pdf_templates')
        .insert({ ...template, user_id: user?.id })
        .select()
        .single();
      return { data: data as PdfTemplate | null, error };
    },
    async update(id: string, updates: Partial<PdfTemplate>) {
      const { data, error } = await supabase
        .from('pdf_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return { data: data as PdfTemplate | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('pdf_templates')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Generated PDFs
  generatedPdfs: {
    async getAll() {
      const { data, error } = await supabase
        .from('generated_pdfs')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as GeneratedPdf[] | null, error };
    },
    async create(pdf: Partial<GeneratedPdf>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('generated_pdfs')
        .insert({ ...pdf, user_id: user?.id })
        .select()
        .single();
      return { data: data as GeneratedPdf | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('generated_pdfs')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Dashboard Stats
  async getDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('get_dashboard_stats', {
      p_user_id: user.id,
    });
    return { data, error };
  },
};

// ==========================================
// FINANCIAL SYSTEM HELPERS
// ==========================================

// Financial Types
export interface Category {
  id: string;
  my_company_id: string;
  name: string;
  type: 'expense' | 'income';
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  my_company_id: string;
  name: string;
  type: 'cash' | 'bank' | 'mercadopago' | 'stripe' | 'paypal' | 'other';
  currency: string;
  bank_name: string | null;
  account_number: string | null;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  color: string | null;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  my_company_id: string;
  description: string;
  amount: number;
  currency: string;
  category_id: string | null;
  category?: Category;
  supplier_name: string | null;
  supplier_tax_id: string | null;
  account_id: string | null;
  account?: Account;
  payment_method: string | null;
  payment_date: string;
  invoice_number: string | null;
  invoice_date: string | null;
  project_id: string | null;
  deal_id: string | null;
  attachment_urls: string[] | null;
  tags: string[] | null;
  notes: string | null;
  status: 'paid' | 'pending' | 'cancelled';
  is_recurring: boolean;
  recurring_frequency: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: string;
  my_company_id: string;
  description: string;
  amount: number;
  currency: string;
  category_id: string | null;
  category?: Category;
  client_id: string | null;
  client_name: string | null;
  account_id: string | null;
  account?: Account;
  payment_method: string | null;
  payment_date: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  project_id: string | null;
  deal_id: string | null;
  payment_link_id: string | null;
  attachment_urls: string[] | null;
  tags: string[] | null;
  notes: string | null;
  status: 'pending' | 'received' | 'cancelled' | 'overdue';
  due_date: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  my_company_id: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month: number | null;
  category_id: string | null;
  category?: Category;
  planned_amount: number;
  currency: string;
  is_active: boolean;
  alert_percentage: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  my_company_id: string;
  account_id: string;
  account?: Account;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description: string | null;
  expense_id: string | null;
  income_id: string | null;
  to_account_id: string | null;
  balance_after: number | null;
  transaction_date: string;
  created_by: string | null;
  created_at: string;
}

export const financial = {
  // Categories
  categories: {
    async getAll(companyId?: string) {
      let query = supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      const { data, error } = await query;
      return { data: data as Category[] | null, error };
    },
    async getByType(type: 'expense' | 'income', companyId?: string) {
      let query = supabase
        .from('categories')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      const { data, error } = await query;
      return { data: data as Category[] | null, error };
    },
    async create(category: Partial<Category>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, created_by: user?.id })
        .select()
        .single();
      return { data: data as Category | null, error };
    },
    async update(id: string, updates: Partial<Category>) {
      const { data, error } = await supabase
        .from('categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return { data: data as Category | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Accounts
  accounts: {
    async getAll(companyId?: string) {
      let query = supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      const { data, error } = await query;
      return { data: data as Account[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as Account | null, error };
    },
    async create(account: Partial<Account>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, created_by: user?.id })
        .select()
        .single();
      return { data: data as Account | null, error };
    },
    async update(id: string, updates: Partial<Account>) {
      const { data, error } = await supabase
        .from('accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return { data: data as Account | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);
      return { error };
    },
    async getTotalBalance(companyId?: string) {
      let query = supabase
        .from('accounts')
        .select('current_balance, currency')
        .eq('is_active', true);
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      const { data, error } = await query;
      if (error || !data) return { data: 0, error };
      
      const total = data.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      return { data: total, error: null };
    },
  },

  // Expenses
  expenses: {
    async getAll(companyId?: string, filters?: { startDate?: string; endDate?: string; categoryId?: string; status?: string }) {
      let query = supabase
        .from('expenses')
        .select('*, category:categories(*), account:accounts(*)')
        .order('payment_date', { ascending: false });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      if (filters?.startDate) {
        query = query.gte('payment_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('payment_date', filters.endDate);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      return { data: data as Expense[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('id', id)
        .single();
      return { data: data as Expense | null, error };
    },
    async create(expense: Partial<Expense>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, created_by: user?.id })
        .select('*, category:categories(*), account:accounts(*)')
        .single();
      return { data: data as Expense | null, error };
    },
    async update(id: string, updates: Partial<Expense>) {
      const { data, error } = await supabase
        .from('expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, category:categories(*), account:accounts(*)')
        .single();
      return { data: data as Expense | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      return { error };
    },
    async getMonthlyTotal(companyId: string, year: number, month: number) {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('my_company_id', companyId)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('status', 'paid');
      
      if (error || !data) return { data: 0, error };
      const total = data.reduce((sum, e) => sum + (e.amount || 0), 0);
      return { data: total, error: null };
    },
  },

  // Incomes
  incomes: {
    async getAll(companyId?: string, filters?: { startDate?: string; endDate?: string; categoryId?: string; status?: string }) {
      let query = supabase
        .from('incomes')
        .select('*, category:categories(*), account:accounts(*)')
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      if (filters?.startDate && filters.startDate) {
        query = query.gte('payment_date', filters.startDate);
      }
      if (filters?.endDate && filters.endDate) {
        query = query.lte('payment_date', filters.endDate);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      return { data: data as Income[] | null, error };
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('incomes')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('id', id)
        .single();
      return { data: data as Income | null, error };
    },
    async create(income: Partial<Income>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('incomes')
        .insert({ ...income, created_by: user?.id })
        .select('*, category:categories(*), account:accounts(*)')
        .single();
      return { data: data as Income | null, error };
    },
    async update(id: string, updates: Partial<Income>) {
      const { data, error } = await supabase
        .from('incomes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, category:categories(*), account:accounts(*)')
        .single();
      return { data: data as Income | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', id);
      return { error };
    },
    async getMonthlyTotal(companyId: string, year: number, month: number) {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('incomes')
        .select('amount')
        .eq('my_company_id', companyId)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('status', 'received');
      
      if (error || !data) return { data: 0, error };
      const total = data.reduce((sum, i) => sum + (i.amount || 0), 0);
      return { data: total, error: null };
    },
    async getPendingIncomes(companyId?: string) {
      let query = supabase
        .from('incomes')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('status', 'pending')
        .order('due_date', { ascending: true });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      const { data, error } = await query;
      return { data: data as Income[] | null, error };
    },
    async getOverdueIncomes(companyId?: string) {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('incomes')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      const { data, error } = await query;
      return { data: data as Income[] | null, error };
    },
  },

  // Budgets
  budgets: {
    async getAll(companyId?: string) {
      let query = supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      const { data, error } = await query;
      return { data: data as Budget[] | null, error };
    },
    async getByPeriod(companyId: string, year: number, month?: number) {
      let query = supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('my_company_id', companyId)
        .eq('year', year)
        .eq('is_active', true);
      
      if (month !== undefined) {
        query = query.eq('month', month);
      }
      
      const { data, error } = await query;
      return { data: data as Budget[] | null, error };
    },
    async create(budget: Partial<Budget>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...budget, created_by: user?.id })
        .select('*, category:categories(*)')
        .single();
      return { data: data as Budget | null, error };
    },
    async update(id: string, updates: Partial<Budget>) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      return { data: data as Budget | null, error };
    },
    async delete(id: string) {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);
      return { error };
    },
  },

  // Transactions
  transactions: {
    async getAll(companyId?: string, accountId?: string, limit: number = 100) {
      let query = supabase
        .from('transactions')
        .select('*, account:accounts(*)')
        .order('transaction_date', { ascending: false })
        .limit(limit);
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      
      const { data, error } = await query;
      return { data: data as Transaction[] | null, error };
    },
    async create(transaction: Partial<Transaction>) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, created_by: user?.id })
        .select('*, account:accounts(*)')
        .single();
      return { data: data as Transaction | null, error };
    },
    async getAccountStatement(accountId: string, startDate: string, endDate: string) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: true });
      return { data: data as Transaction[] | null, error };
    },
  },

  // Financial Reports
  reports: {
    async getCashFlow(companyId?: string, year?: number, month?: number) {
      const yr = year ?? new Date().getFullYear();
      // Get monthly cash flow data
      const months = month !== undefined ? [month] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const cashFlow: { month: number; income: number; expense: number; net: number }[] = [];
      
      for (const m of months) {
        const startDate = new Date(yr, m, 1).toISOString().split('T')[0];
        const endDate = new Date(yr, m + 1, 0).toISOString().split('T')[0];
        
        let expQ = supabase.from('expenses').select('amount').gte('payment_date', startDate).lte('payment_date', endDate).eq('status', 'paid');
        let incQ = supabase.from('incomes').select('amount').gte('payment_date', startDate).lte('payment_date', endDate).eq('status', 'received');
        if (companyId) {
          expQ = expQ.eq('my_company_id', companyId);
          incQ = incQ.eq('my_company_id', companyId);
        }
        const [expensesRes, incomesRes] = await Promise.all([expQ, incQ]);
        
        const expense = (expensesRes.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
        const income = (incomesRes.data || []).reduce((sum, i) => sum + (i.amount || 0), 0);
        
        cashFlow.push({ month: m, income, expense, net: income - expense });
      }
      
      return { data: cashFlow, error: null };
    },
    
    async getExpensesByCategory(companyId?: string, startDate?: string, endDate?: string) {
      let query = supabase
        .from('expenses')
        .select('amount, category:categories(id, name, color, icon)')
        .eq('status', 'paid');
      if (companyId) query = query.eq('my_company_id', companyId);
      if (startDate) query = query.gte('payment_date', startDate);
      if (endDate) query = query.lte('payment_date', endDate);
      const { data, error } = await query;
      
      if (error || !data) return { data: [], error };
      
      const grouped: Record<string, { name: string; color: string; icon: string; amount: number }> = {};
      data.forEach((e: any) => {
        const catId = e.category?.id || 'uncategorized';
        const catName = e.category?.name || 'Sin categoría';
        if (!grouped[catId]) {
          grouped[catId] = {
            name: catName,
            color: e.category?.color || '#9CA3AF',
            icon: e.category?.icon || '📊',
            amount: 0,
          };
        }
        grouped[catId].amount += e.amount || 0;
      });
      
      return { data: Object.values(grouped).sort((a, b) => b.amount - a.amount), error: null };
    },
    
    async getIncomesByCategory(companyId?: string, startDate?: string, endDate?: string) {
      let query = supabase
        .from('incomes')
        .select('amount, category:categories(id, name, color, icon)')
        .eq('status', 'received');
      if (companyId) query = query.eq('my_company_id', companyId);
      if (startDate) query = query.gte('payment_date', startDate);
      if (endDate) query = query.lte('payment_date', endDate);
      const { data, error } = await query;
      
      if (error || !data) return { data: [], error };
      
      const grouped: Record<string, { name: string; color: string; icon: string; amount: number }> = {};
      data.forEach((i: any) => {
        const catId = i.category?.id || 'uncategorized';
        const catName = i.category?.name || 'Sin categoría';
        if (!grouped[catId]) {
          grouped[catId] = {
            name: catName,
            color: i.category?.color || '#10B981',
            icon: i.category?.icon || '💰',
            amount: 0,
          };
        }
        grouped[catId].amount += i.amount || 0;
      });
      
      return { data: Object.values(grouped).sort((a, b) => b.amount - a.amount), error: null };
    },
    
    async getProfitLoss(companyId?: string, year?: number) {
      const cashFlow = await financial.reports.getCashFlow(companyId, year ?? new Date().getFullYear());
      if (!cashFlow.data) return { data: null, error: cashFlow.error };
      
      const totalIncome = cashFlow.data.reduce((sum, m) => sum + m.income, 0);
      const totalExpense = cashFlow.data.reduce((sum, m) => sum + m.expense, 0);
      const netProfit = totalIncome - totalExpense;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
      
      return {
        data: {
          totalIncome,
          totalExpense,
          netProfit,
          profitMargin,
          monthlyData: cashFlow.data,
        },
        error: null,
      };
    },
  },
};

// ==========================================
// STORAGE HELPERS
// ==========================================

export const storage = {
  async uploadFile(file: File, folder: string = 'general') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (error) return { data: null, error };

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return { data: { path: fileName, url: publicUrl }, error: null };
  },

  async deleteFile(path: string) {
    const { error } = await supabase.storage
      .from('documents')
      .remove([path]);
    return { error };
  },

  getPublicUrl(path: string) {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(path);
    return data.publicUrl;
  },
};

// ==========================================
// CRM ADVANCED - DATABASE HELPERS
// ==========================================

import type { 
  ContactActivity, 
  ClientLeadScore, 
  ClientSegment, 
  ScheduledCommunication,
  ClientCRMSummary,
  PendingFollowUp,
  ContactActivityType,
  CommunicationDirection,
  InteractionSentiment
} from './types';

export const crm = {
  // ==========================================
  // CONTACT ACTIVITIES
  // ==========================================
  activities: {
    async getAll(companyId?: string, filters?: {
      contactId?: string;
      activityType?: ContactActivityType;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }) {
      let query = supabase
        .from('contact_activities')
        .select('*')
        .order('activity_date', { ascending: false });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      if (filters?.activityType) {
        query = query.eq('activity_type', filters.activityType);
      }
      if (filters?.startDate) {
        query = query.gte('activity_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('activity_date', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      
      if (error) return { data: null, error };
      
      // Map to camelCase
      const activities: ContactActivity[] = (data || []).map(a => ({
        id: a.id,
        myCompanyId: a.my_company_id,
        contactId: a.contact_id,
        createdBy: a.created_by,
        assignedTo: a.assigned_to,
        activityType: a.activity_type,
        direction: a.direction,
        sentiment: a.sentiment,
        subject: a.subject,
        description: a.description,
        outcome: a.outcome,
        activityDate: a.activity_date,
        durationMinutes: a.duration_minutes,
        dealId: a.deal_id,
        projectId: a.project_id,
        taskId: a.task_id,
        followUpDate: a.follow_up_date,
        followUpNotes: a.follow_up_notes,
        isFollowUpDone: a.is_follow_up_done,
        attachments: a.attachments,
        metadata: a.metadata,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }));
      
      return { data: activities, error: null };
    },
    
    async getByContact(companyId?: string, contactId?: string, limit: number = 50) {
      return this.getAll(companyId, { contactId, limit });
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('contact_activities')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return { data: null, error };
      
      const activity: ContactActivity = {
        id: data.id,
        myCompanyId: data.my_company_id,
        contactId: data.contact_id,
        createdBy: data.created_by,
        assignedTo: data.assigned_to,
        activityType: data.activity_type,
        direction: data.direction,
        sentiment: data.sentiment,
        subject: data.subject,
        description: data.description,
        outcome: data.outcome,
        activityDate: data.activity_date,
        durationMinutes: data.duration_minutes,
        dealId: data.deal_id,
        projectId: data.project_id,
        taskId: data.task_id,
        followUpDate: data.follow_up_date,
        followUpNotes: data.follow_up_notes,
        isFollowUpDone: data.is_follow_up_done,
        attachments: data.attachments,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      return { data: activity, error: null };
    },
    
    async create(activity: {
      myCompanyId: string;
      contactId: string;
      activityType: ContactActivityType;
      direction?: CommunicationDirection;
      sentiment?: InteractionSentiment;
      subject?: string;
      description?: string;
      outcome?: string;
      activityDate?: string;
      durationMinutes?: number;
      dealId?: string;
      projectId?: string;
      taskId?: string;
      followUpDate?: string;
      followUpNotes?: string;
      createdBy?: string;
      assignedTo?: string;
      attachments?: { name: string; url: string; type: string }[];
    }) {
      const { data, error } = await supabase
        .from('contact_activities')
        .insert({
          my_company_id: activity.myCompanyId,
          contact_id: activity.contactId,
          activity_type: activity.activityType,
          direction: activity.direction || 'outbound',
          sentiment: activity.sentiment || 'neutral',
          subject: activity.subject,
          description: activity.description,
          outcome: activity.outcome,
          activity_date: activity.activityDate || new Date().toISOString(),
          duration_minutes: activity.durationMinutes || 0,
          deal_id: activity.dealId,
          project_id: activity.projectId,
          task_id: activity.taskId,
          follow_up_date: activity.followUpDate,
          follow_up_notes: activity.followUpNotes,
          created_by: activity.createdBy,
          assigned_to: activity.assignedTo,
          attachments: activity.attachments || [],
        })
        .select()
        .single();
      
      if (error) return { data: null, error };
      
      return { data: data.id, error: null };
    },
    
    async update(id: string, updates: Partial<{
      activityType: ContactActivityType;
      direction: CommunicationDirection;
      sentiment: InteractionSentiment;
      subject: string;
      description: string;
      outcome: string;
      activityDate: string;
      durationMinutes: number;
      followUpDate: string;
      followUpNotes: string;
      isFollowUpDone: boolean;
      assignedTo: string;
      attachments: { name: string; url: string; type: string }[];
    }>) {
      const updateData: Record<string, unknown> = {};
      
      if (updates.activityType !== undefined) updateData.activity_type = updates.activityType;
      if (updates.direction !== undefined) updateData.direction = updates.direction;
      if (updates.sentiment !== undefined) updateData.sentiment = updates.sentiment;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.outcome !== undefined) updateData.outcome = updates.outcome;
      if (updates.activityDate !== undefined) updateData.activity_date = updates.activityDate;
      if (updates.durationMinutes !== undefined) updateData.duration_minutes = updates.durationMinutes;
      if (updates.followUpDate !== undefined) updateData.follow_up_date = updates.followUpDate;
      if (updates.followUpNotes !== undefined) updateData.follow_up_notes = updates.followUpNotes;
      if (updates.isFollowUpDone !== undefined) updateData.is_follow_up_done = updates.isFollowUpDone;
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
      if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
      
      const { error } = await supabase
        .from('contact_activities')
        .update(updateData)
        .eq('id', id);
      
      return { error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('contact_activities')
        .delete()
        .eq('id', id);
      
      return { error };
    },
    
    async markFollowUpDone(id: string) {
      return this.update(id, { isFollowUpDone: true });
    },
    
    async getPendingFollowUps(companyId?: string) {
      let query = supabase
        .from('pending_follow_ups')
        .select('*')
        .order('follow_up_date', { ascending: true });
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      const { data, error } = await query;
      
      if (error) return { data: null, error };
      
      const followUps: PendingFollowUp[] = (data || []).map(f => ({
        id: f.id,
        myCompanyId: f.my_company_id,
        contactId: f.contact_id,
        contactName: f.contact_name,
        contactEmail: f.contact_email,
        subject: f.subject,
        activityType: f.activity_type,
        activityDate: f.activity_date,
        followUpDate: f.follow_up_date,
        followUpNotes: f.follow_up_notes,
        assignedTo: f.assigned_to,
        urgency: f.urgency,
      }));
      
      return { data: followUps, error: null };
    },
    
    // Quick log methods
    async logCall(companyId: string, contactId: string, params: {
      subject: string;
      description?: string;
      outcome?: string;
      durationMinutes?: number;
      sentiment?: InteractionSentiment;
      direction?: CommunicationDirection;
      followUpDate?: string;
      followUpNotes?: string;
    }) {
      return this.create({
        myCompanyId: companyId,
        contactId,
        activityType: 'call',
        direction: params.direction || 'outbound',
        ...params,
      });
    },
    
    async logEmail(companyId: string, contactId: string, params: {
      subject: string;
      description?: string;
      direction?: CommunicationDirection;
      activityDate?: string;
    }) {
      return this.create({
        myCompanyId: companyId,
        contactId,
        activityType: 'email',
        direction: params.direction || 'outbound',
        ...params,
      });
    },
    
    async logMeeting(companyId: string, contactId: string, params: {
      subject: string;
      description?: string;
      outcome?: string;
      durationMinutes?: number;
      sentiment?: InteractionSentiment;
      followUpDate?: string;
      followUpNotes?: string;
    }) {
      return this.create({
        myCompanyId: companyId,
        contactId,
        activityType: 'meeting',
        ...params,
      });
    },
    
    async logNote(companyId: string, contactId: string, params: {
      subject: string;
      description?: string;
      activityDate?: string;
    }) {
      return this.create({
        myCompanyId: companyId,
        contactId,
        activityType: 'note',
        direction: 'internal',
        ...params,
      });
    },
  },
  
  // ==========================================
  // LEAD SCORES
  // ==========================================
  scores: {
    async getAll(companyId?: string, filters?: {
      temperature?: string;
      minScore?: number;
      maxScore?: number;
    }) {
      let query = supabase
        .from('contact_lead_scores')
        .select('*')
        .order('total_score', { ascending: false });
      
      if (companyId) {
        query = query.eq('my_company_id', companyId);
      }
      
      if (filters?.temperature) {
        query = query.eq('temperature', filters.temperature);
      }
      if (filters?.minScore !== undefined) {
        query = query.gte('total_score', filters.minScore);
      }
      if (filters?.maxScore !== undefined) {
        query = query.lte('total_score', filters.maxScore);
      }
      
      const { data, error } = await query;
      
      if (error) return { data: null, error };
      
      const scores: ClientLeadScore[] = (data || []).map(s => ({
        id: s.id,
        myCompanyId: s.my_company_id,
        contactId: s.contact_id,
        totalScore: s.total_score,
        temperature: s.temperature,
        engagementScore: s.engagement_score,
        profileScore: s.profile_score,
        behaviorScore: s.behavior_score,
        financialScore: s.financial_score,
        lastActivityDate: s.last_activity_date,
        lastScoreUpdate: s.last_score_update,
        decayRate: s.decay_rate,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
      
      return { data: scores, error: null };
    },
    
    async getByContact(companyId?: string, contactId?: string) {
      let query = supabase
        .from('contact_lead_scores')
        .select('*');
      if (companyId) query = query.eq('my_company_id', companyId);
      if (contactId) query = query.eq('contact_id', contactId);
      const { data, error } = await query
        .maybeSingle();
      
      if (error) return { data: null, error };
      if (!data) return { data: null, error: null };
      
      const score: ClientLeadScore = {
        id: data.id,
        myCompanyId: data.my_company_id,
        contactId: data.contact_id,
        totalScore: data.total_score,
        temperature: data.temperature,
        engagementScore: data.engagement_score,
        profileScore: data.profile_score,
        behaviorScore: data.behavior_score,
        financialScore: data.financial_score,
        lastActivityDate: data.last_activity_date,
        lastScoreUpdate: data.last_score_update,
        decayRate: data.decay_rate,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      return { data: score, error: null };
    },
    
    async recalculate(companyId: string, contactId: string) {
      // Call the database function to recalculate score
      const { data, error } = await supabase.rpc('calculate_contact_lead_score', {
        p_contact_id: contactId,
        p_my_company_id: companyId,
      });
      
      return { data, error };
    },
    
    async getHotLeads(companyId?: string, limit: number = 10) {
      let query = supabase
        .from('contact_lead_scores')
        .select(`
          *,
          contacts (id, first_name, last_name, email, phone, company)
        `)
        .in('temperature', ['hot', 'very_hot'])
        .order('total_score', { ascending: false })
        .limit(limit);
      if (companyId) query = query.eq('my_company_id', companyId);
      const { data, error } = await query;
      
      return { data, error };
    },
  },
  
  // ==========================================
  // CONTACT SEGMENTS
  // ==========================================
  segments: {
    async getAll(companyId?: string) {
      let query = supabase
        .from('contact_segments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (companyId) query = query.eq('my_company_id', companyId);
      const { data, error } = await query;
      
      if (error) return { data: null, error };
      
      const segments: ClientSegment[] = (data || []).map(s => ({
        id: s.id,
        myCompanyId: s.my_company_id,
        name: s.name,
        description: s.description,
        color: s.color,
        icon: s.icon,
        segmentType: s.segment_type,
        conditions: s.conditions,
        contactCount: s.client_count,
        clientCount: s.client_count || 0,
        isActive: s.is_active,
        createdBy: s.created_by,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
      
      return { data: segments, error: null };
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('contact_segments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return { data: null, error };
      
      const segment: ClientSegment = {
        id: data.id,
        myCompanyId: data.my_company_id,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        segmentType: data.segment_type,
        conditions: data.conditions,
        clientCount: data.client_count || 0,
        isActive: data.is_active,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      return { data: segment, error: null };
    },
    
    async create(segment: {
      myCompanyId: string;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      segmentType?: 'manual' | 'dynamic' | 'smart';
      conditions?: Record<string, unknown>;
      createdBy?: string;
    }) {
      const { data, error } = await supabase
        .from('contact_segments')
        .insert({
          my_company_id: segment.myCompanyId,
          name: segment.name,
          description: segment.description,
          color: segment.color || '#6366F1',
          icon: segment.icon || 'users',
          segment_type: segment.segmentType || 'manual',
          conditions: segment.conditions || {},
          created_by: segment.createdBy,
        })
        .select()
        .single();
      
      if (error) return { data: null, error };
      return { data: data.id, error: null };
    },
    
    async update(id: string, updates: Partial<{
      name: string;
      description: string;
      color: string;
      icon: string;
      conditions: Record<string, unknown>;
      isActive: boolean;
    }>) {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      const { error } = await supabase
        .from('contact_segments')
        .update(updateData)
        .eq('id', id);
      
      return { error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('contact_segments')
        .delete()
        .eq('id', id);
      
      return { error };
    },
    
    async addContact(segmentId: string, contactId: string, addedBy?: string) {
      const { error } = await supabase
        .from('contact_segment_members')
        .insert({
          segment_id: segmentId,
          contact_id: contactId,
          added_by: addedBy,
        });
      
      return { error };
    },
    
    async removeContact(segmentId: string, contactId: string) {
      const { error } = await supabase
        .from('contact_segment_members')
        .delete()
        .eq('segment_id', segmentId)
        .eq('contact_id', contactId);
      
      return { error };
    },
    
    async getContacts(segmentId: string) {
      const { data, error } = await supabase
        .from('contact_segment_members')
        .select(`
          *,
          contacts (id, first_name, last_name, email, phone, company, type, status)
        `)
        .eq('segment_id', segmentId);
      
      return { data, error };
    },
    
    async getContactSegments(contactId: string) {
      const { data, error } = await supabase
        .from('contact_segment_members')
        .select(`
          *,
          contact_segments (id, name, color, icon)
        `)
        .eq('contact_id', contactId);
      
      return { data, error };
    },
  },
  
  // ==========================================
  // CRM SUMMARY
  // ==========================================
  summary: {
    async getContactCRMSummary(companyId: string, contactId: string) {
      const { data, error } = await supabase
        .from('contact_crm_summary')
        .select('*')
        .eq('user_id', companyId)
        .eq('id', contactId)
        .single();
      
      if (error) return { data: null, error };
      
      const summary: ClientCRMSummary = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        type: data.type,
        isActive: data.is_active,
        myCompanyId: data.my_company_id,
        leadScore: data.lead_score || 0,
        temperature: data.temperature || 'cold',
        engagementScore: data.engagement_score,
        profileScore: data.profile_score,
        financialScore: data.financial_score,
        totalActivities: data.total_activities || 0,
        lastActivityDate: data.last_activity_date,
        lastActivityType: data.last_activity_type,
        dealsCount: data.deals_count || 0,
        totalRevenue: data.total_revenue || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      return { data: summary, error: null };
    },
    
    async getAllContactsSummary(companyId: string, filters?: {
      temperature?: string;
      hasActivities?: boolean;
      sortBy?: 'lead_score' | 'total_revenue' | 'last_activity_date';
      sortOrder?: 'asc' | 'desc';
    }) {
      let query = supabase
        .from('contact_crm_summary')
        .select('*')
        .eq('user_id', companyId);
      
      if (filters?.temperature) {
        query = query.eq('temperature', filters.temperature);
      }
      if (filters?.hasActivities) {
        query = query.gt('total_activities', 0);
      }
      
      const sortField = filters?.sortBy || 'lead_score';
      const sortOrder = filters?.sortOrder === 'asc' ? true : false;
      query = query.order(sortField, { ascending: sortOrder });
      
      const { data, error } = await query;
      
      if (error) return { data: null, error };
      
      const summaries: ClientCRMSummary[] = (data || []).map(d => ({
        id: d.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        company: d.company,
        type: d.type,
        isActive: d.status === 'active',
        myCompanyId: d.user_id,
        leadScore: d.lead_score || 0,
        temperature: d.temperature || 'cold',
        engagementScore: d.engagement_score,
        profileScore: d.profile_score,
        financialScore: d.financial_score,
        totalActivities: d.total_activities || 0,
        lastActivityDate: d.last_activity_date,
        lastActivityType: d.last_activity_type,
        dealsCount: d.deals_count || 0,
        totalRevenue: d.total_revenue || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
      
      return { data: summaries, error: null };
    },
    
    async getDashboardMetrics(companyId?: string) {
      let scoresQ = supabase.from('contact_lead_scores').select('id', { count: 'exact' }).in('temperature', ['hot', 'very_hot']);
      let followUpsQ = supabase.from('pending_follow_ups').select('id', { count: 'exact' });
      let activitiesQ = supabase.from('contact_activities').select('id', { count: 'exact' }).gte('activity_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if (companyId) {
        scoresQ = scoresQ.eq('my_company_id', companyId);
        followUpsQ = followUpsQ.eq('my_company_id', companyId);
        activitiesQ = activitiesQ.eq('my_company_id', companyId);
      }
      const [scoresResult, followUpsResult, activitiesResult] = await Promise.all([scoresQ, followUpsQ, activitiesQ]);
      
      return {
        hotLeadsCount: scoresResult.count || 0,
        pendingFollowUpsCount: followUpsResult.count || 0,
        activitiesThisWeek: activitiesResult.count || 0,
      };
    },
  },
  
  // ==========================================
  // QUOTES / COTIZACIONES
  // ==========================================
  quotes: {
    async getAll(userId: string) {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          items:quote_items(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          items:quote_items(*)
        `)
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    
    async create(quote: {
      userId: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      contactCompany?: string;
      title: string;
      currency?: string;
      validUntil?: string;
      notes?: string;
      terms?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        taxRate?: number;
      }>;
    }) {
      // Generate quote number
      const { count } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', quote.userId);
      
      const quoteNumber = `COT-${String((count || 0) + 1).padStart(5, '0')}`;
      
      // Insert quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: quote.userId,
          contact_name: quote.contactName,
          contact_email: quote.contactEmail,
          contact_phone: quote.contactPhone,
          contact_company: quote.contactCompany,
          quote_number: quoteNumber,
          title: quote.title,
          currency: quote.currency || 'MXN',
          valid_until: quote.validUntil,
          notes: quote.notes,
          terms: quote.terms,
        })
        .select()
        .single();
      
      if (quoteError) return { data: null, error: quoteError };
      
      // Insert quote items
      if (quote.items.length > 0) {
        const itemsToInsert = quote.items.map((item, index) => ({
          quote_id: quoteData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_percent: item.discount || 0,
          tax_rate: item.taxRate || 16,
          sort_order: index,
        }));
        
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(itemsToInsert);
        
        if (itemsError) return { data: quoteData, error: itemsError };
      }
      
      // Fetch complete quote with items
      return await this.getById(quoteData.id);
    },
    
    async update(id: string, updates: {
      title?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      contactCompany?: string;
      currency?: string;
      validUntil?: string;
      notes?: string;
      terms?: string;
      status?: string;
      items?: Array<{
        id?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        taxRate?: number;
      }>;
    }) {
      // Update quote
      const quoteUpdates: Record<string, unknown> = {};
      if (updates.title) quoteUpdates.title = updates.title;
      if (updates.contactName !== undefined) quoteUpdates.contact_name = updates.contactName;
      if (updates.contactEmail !== undefined) quoteUpdates.contact_email = updates.contactEmail;
      if (updates.contactPhone !== undefined) quoteUpdates.contact_phone = updates.contactPhone;
      if (updates.contactCompany !== undefined) quoteUpdates.contact_company = updates.contactCompany;
      if (updates.currency) quoteUpdates.currency = updates.currency;
      if (updates.validUntil) quoteUpdates.valid_until = updates.validUntil;
      if (updates.notes !== undefined) quoteUpdates.notes = updates.notes;
      if (updates.terms !== undefined) quoteUpdates.terms = updates.terms;
      if (updates.status) quoteUpdates.status = updates.status;
      
      if (Object.keys(quoteUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from('quotes')
          .update(quoteUpdates)
          .eq('id', id);
        
        if (updateError) return { data: null, error: updateError };
      }
      
      // Update items if provided
      if (updates.items) {
        // Delete existing items
        await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', id);
        
        // Insert new items
        const itemsToInsert = updates.items.map((item, index) => ({
          quote_id: id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_percent: item.discount || 0,
          tax_rate: item.taxRate || 16,
          sort_order: index,
        }));
        
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(itemsToInsert);
        
        if (itemsError) return { data: null, error: itemsError };
      }
      
      return await this.getById(id);
    },
    
    async updateStatus(id: string, status: string) {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
      } else if (status === 'accepted') {
        updates.accepted_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updates.rejected_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async delete(id: string) {
      // Items are deleted automatically via cascade
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
      
      return { error };
    },
    
    async duplicate(id: string) {
      // Get original quote
      const { data: original, error: fetchError } = await this.getById(id);
      if (fetchError || !original) return { data: null, error: fetchError };
      
      // Generate new quote number
      const { count } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', original.user_id);
      
      const quoteNumber = `COT-${String((count || 0) + 1).padStart(5, '0')}`;
      
      // Create new quote
      const { data: newQuote, error: createError } = await supabase
        .from('quotes')
        .insert({
          user_id: original.user_id,
          contact_name: original.contact_name,
          contact_email: original.contact_email,
          contact_phone: original.contact_phone,
          contact_company: original.contact_company,
          quote_number: quoteNumber,
          title: `${original.title} (copia)`,
          currency: original.currency,
          valid_until: null,
          notes: original.notes,
          terms: original.terms,
        })
        .select()
        .single();
      
      if (createError) return { data: null, error: createError };
      
      // Copy items
      if (original.items && original.items.length > 0) {
        const itemsToInsert = original.items.map((item: { description: string; quantity: number; unit_price: number; discount_percent: number; tax_rate: number; sort_order: number }) => ({
          quote_id: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_rate: item.tax_rate,
          sort_order: item.sort_order,
        }));
        
        await supabase.from('quote_items').insert(itemsToInsert);
      }
      
      return await this.getById(newQuote.id);
    },
  },
  
  // ==========================================
  // TIME TRACKING
  // ==========================================
  timeTracking: {
    async getEntries(userId: string, filters?: { startDate?: string; endDate?: string }) {
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });
      
      if (filters?.startDate) {
        query = query.gte('start_time', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('start_time', filters.endDate);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    async getActiveTimer(userId: string) {
      const { data, error } = await supabase
        .from('active_timers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      return { data, error };
    },
    
    async startTimer(timer: {
      userId: string;
      projectName?: string;
      taskName?: string;
      description?: string;
    }) {
      // First, stop any existing timer
      await this.stopTimer(timer.userId);
      
      const { data, error } = await supabase
        .from('active_timers')
        .insert({
          user_id: timer.userId,
          project_name: timer.projectName,
          task_name: timer.taskName,
          description: timer.description,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      return { data, error };
    },
    
    async stopTimer(userId: string) {
      // Get active timer
      const { data: timer } = await this.getActiveTimer(userId);
      if (!timer) return { data: null, error: null };
      
      // Calculate duration
      const startTime = new Date(timer.started_at);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      // Create time entry
      const { data: entry, error: entryError } = await supabase
        .from('time_entries')
        .insert({
          user_id: userId,
          project_name: timer.project_name,
          task_name: timer.task_name,
          description: timer.description,
          start_time: timer.started_at,
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          is_billable: true,
        })
        .select()
        .single();
      
      if (entryError) return { data: null, error: entryError };
      
      // Delete active timer
      await supabase
        .from('active_timers')
        .delete()
        .eq('id', timer.id);
      
      return { data: entry, error: null };
    },
    
    async createManualEntry(entry: {
      userId: string;
      projectName?: string;
      taskName?: string;
      description?: string;
      startTime: string;
      endTime: string;
      isBillable?: boolean;
      hourlyRate?: number;
    }) {
      const startTime = new Date(entry.startTime);
      const endTime = new Date(entry.endTime);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: entry.userId,
          project_name: entry.projectName,
          task_name: entry.taskName,
          description: entry.description,
          start_time: entry.startTime,
          end_time: entry.endTime,
          duration_minutes: durationMinutes,
          is_billable: entry.isBillable ?? true,
          hourly_rate: entry.hourlyRate,
        })
        .select()
        .single();
      
      return { data, error };
    },
    
    async updateEntry(id: string, updates: Partial<{
      description: string;
      startTime: string;
      endTime: string;
      isBillable: boolean;
      hourlyRate: number;
    }>) {
      const updateData: Record<string, unknown> = {};
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.startTime) updateData.start_time = updates.startTime;
      if (updates.endTime) updateData.end_time = updates.endTime;
      if (updates.isBillable !== undefined) updateData.is_billable = updates.isBillable;
      if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
      
      // Recalculate duration if times changed
      if (updates.startTime && updates.endTime) {
        const startTime = new Date(updates.startTime);
        const endTime = new Date(updates.endTime);
        updateData.duration_minutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      }
      
      const { data, error } = await supabase
        .from('time_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async deleteEntry(id: string) {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);
      
      return { error };
    },
    
    async getStats(userId: string, period: 'today' | 'week' | 'month') {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
      
      const { data, error } = await supabase
        .from('time_entries')
        .select('duration_minutes, is_billable, hourly_rate')
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString());
      
      if (error) return { data: null, error };
      
      const totalMinutes = data.reduce((sum, e) => sum + e.duration_minutes, 0);
      const billableMinutes = data.filter(e => e.is_billable).reduce((sum, e) => sum + e.duration_minutes, 0);
      const totalAmount = data.filter(e => e.is_billable && e.hourly_rate).reduce((sum, e) => sum + (e.duration_minutes / 60 * e.hourly_rate), 0);
      
      return {
        data: {
          totalMinutes,
          billableMinutes,
          nonBillableMinutes: totalMinutes - billableMinutes,
          totalAmount,
          entriesCount: data.length,
        },
        error: null,
      };
    },
  },
  
  // ==========================================
  // PRODUCTS
  // ==========================================
  products: {
    async getAll(userId: string, includeInactive = false) {
      let query = supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      return { data, error };
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    
    async create(product: {
      userId: string;
      name: string;
      description?: string;
      sku?: string;
      type: 'product' | 'service';
      price: number;
      cost?: number;
      currency?: string;
      taxRate?: number;
      unit?: string;
      category?: string;
    }) {
      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: product.userId,
          name: product.name,
          description: product.description,
          sku: product.sku,
          type: product.type,
          price: product.price,
          cost: product.cost,
          currency: product.currency || 'MXN',
          tax_rate: product.taxRate || 16,
          unit: product.unit,
          category: product.category,
        })
        .select()
        .single();
      
      return { data, error };
    },
    
    async update(id: string, updates: Partial<{
      name: string;
      description: string;
      sku: string;
      price: number;
      cost: number;
      taxRate: number;
      unit: string;
      category: string;
      isActive: boolean;
    }>) {
      const updateData: Record<string, unknown> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.cost !== undefined) updateData.cost = updates.cost;
      if (updates.taxRate !== undefined) updateData.tax_rate = updates.taxRate;
      if (updates.unit !== undefined) updateData.unit = updates.unit;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      return { error };
    },
  },
};

// Alias for backward compatibility
export const supabaseHelpers = db;
