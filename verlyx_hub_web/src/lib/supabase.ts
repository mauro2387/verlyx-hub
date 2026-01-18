import { createClient } from '@supabase/supabase-js';

// Environment variables for Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Using demo mode.');
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://demo.supabase.co',
  supabaseAnonKey || 'demo-key',
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
