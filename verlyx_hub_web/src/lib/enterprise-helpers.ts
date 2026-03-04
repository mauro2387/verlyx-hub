import { supabase } from './supabase';
import { useCompanyStore } from './store';

// ==========================================
// ENTERPRISE MODULES HELPERS
// Standalone helpers for quotes and time tracking
// ==========================================

export const enterpriseHelpers = {
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
      myCompanyId?: string;
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
      const quoteNumber = `COT-${Date.now().toString(36).toUpperCase()}`;
      
      // Create quote
      const companyId = quote.myCompanyId || useCompanyStore.getState().selectedCompanyId;
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: quote.userId,
          quote_number: quoteNumber,
          title: quote.title,
          status: 'draft',
          currency: quote.currency || 'MXN',
          valid_until: quote.validUntil,
          notes: quote.notes,
          terms: quote.terms,
          contact_name: quote.contactName,
          contact_email: quote.contactEmail,
          contact_phone: quote.contactPhone,
          contact_company: quote.contactCompany,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          my_company_id: companyId,
        })
        .select()
        .single();
      
      if (quoteError || !quoteData) return { data: null, error: quoteError };
      
      // Create items
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
      
      if (itemsError) return { data: null, error: itemsError };
      
      // Calculate totals - items have generated columns
      const { data: itemsData } = await supabase
        .from('quote_items')
        .select('subtotal, tax_amount, total')
        .eq('quote_id', quoteData.id);
      
      const totals = (itemsData || []).reduce(
        (acc, item) => ({
          subtotal: acc.subtotal + (item.subtotal || 0),
          tax_amount: acc.tax_amount + (item.tax_amount || 0),
          total: acc.total + (item.total || 0),
        }),
        { subtotal: 0, tax_amount: 0, total: 0 }
      );
      
      // Update quote totals
      const { data: finalQuote, error: updateError } = await supabase
        .from('quotes')
        .update(totals)
        .eq('id', quoteData.id)
        .select(`
          *,
          items:quote_items(*)
        `)
        .single();
      
      return { data: finalQuote, error: updateError };
    },
    
    async update(id: string, updates: {
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      contactCompany?: string;
      title?: string;
      currency?: string;
      validUntil?: string;
      notes?: string;
      terms?: string;
    }) {
      const updateData: Record<string, unknown> = {};
      if (updates.contactName !== undefined) updateData.contact_name = updates.contactName;
      if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail;
      if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone;
      if (updates.contactCompany !== undefined) updateData.contact_company = updates.contactCompany;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.currency !== undefined) updateData.currency = updates.currency;
      if (updates.validUntil !== undefined) updateData.valid_until = updates.validUntil;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.terms !== undefined) updateData.terms = updates.terms;
      
      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          items:quote_items(*)
        `)
        .single();
      
      return { data, error };
    },
    
    async updateStatus(id: string, status: string) {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async duplicate(id: string) {
      // Get original quote
      const { data: original, error: fetchError } = await supabase
        .from('quotes')
        .select(`
          *,
          items:quote_items(*)
        `)
        .eq('id', id)
        .single();
      
      if (fetchError || !original) return { data: null, error: fetchError };
      
      // Create new quote
      const quoteNumber = `COT-${Date.now().toString(36).toUpperCase()}`;
      
      const { data: newQuote, error: createError } = await supabase
        .from('quotes')
        .insert({
          user_id: original.user_id,
          quote_number: quoteNumber,
          title: `${original.title} (copia)`,
          status: 'draft',
          currency: original.currency,
          notes: original.notes,
          terms: original.terms,
          contact_name: original.contact_name,
          contact_email: original.contact_email,
          contact_phone: original.contact_phone,
          contact_company: original.contact_company,
          subtotal: original.subtotal,
          tax_amount: original.tax_amount,
          total: original.total,
        })
        .select()
        .single();
      
      if (createError || !newQuote) return { data: null, error: createError };
      
      // Copy items
      if (original.items && original.items.length > 0) {
        const itemsToInsert = original.items.map((item: any, index: number) => ({
          quote_id: newQuote.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          tax_rate: item.tax_rate,
          sort_order: index,
        }));
        
        await supabase.from('quote_items').insert(itemsToInsert);
      }
      
      return { data: newQuote, error: null };
    },
    
    async delete(id: string) {
      // Items will be deleted by cascade
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
      
      return { error };
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
      myCompanyId?: string;
      projectName?: string;
      taskName?: string;
      description?: string;
    }) {
      // First, stop any existing timer
      await this.stopTimer(timer.userId);
      
      const timerCompanyId = timer.myCompanyId || useCompanyStore.getState().selectedCompanyId;
      const { data, error } = await supabase
        .from('active_timers')
        .insert({
          user_id: timer.userId,
          project_name: timer.projectName,
          task_name: timer.taskName,
          description: timer.description,
          started_at: new Date().toISOString(),
          my_company_id: timerCompanyId,
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
      myCompanyId?: string;
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
      
      const entryCompanyId = entry.myCompanyId || useCompanyStore.getState().selectedCompanyId;
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
          my_company_id: entryCompanyId,
        })
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
  },
  
  // ==========================================
  // PRODUCTS / CATÁLOGO
  // ==========================================
  products: {
    async getAll(userId: string) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
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
      myCompanyId?: string;
      sku?: string;
      name: string;
      description?: string;
      productType?: string;
      currency?: string;
      price: number;
      cost?: number;
      unit?: string;
      taxRate?: number;
      isHourly?: boolean;
      category?: string;
      tags?: string[];
      imageUrl?: string;
    }) {
      const prodCompanyId = product.myCompanyId || useCompanyStore.getState().selectedCompanyId;
      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: product.userId,
          sku: product.sku,
          name: product.name,
          description: product.description,
          product_type: product.productType || 'service',
          currency: product.currency || 'MXN',
          price: product.price,
          cost: product.cost || 0,
          unit: product.unit || 'unidad',
          tax_rate: product.taxRate || 16,
          is_hourly: product.isHourly || false,
          category: product.category,
          tags: product.tags || [],
          image_url: product.imageUrl,
          is_active: true,
          my_company_id: prodCompanyId,
        })
        .select()
        .single();
      
      return { data, error };
    },
    
    async update(id: string, updates: {
      sku?: string;
      name?: string;
      description?: string;
      productType?: string;
      price?: number;
      cost?: number;
      unit?: string;
      taxRate?: number;
      isHourly?: boolean;
      category?: string;
      tags?: string[];
      imageUrl?: string;
      isActive?: boolean;
    }) {
      const updateData: Record<string, unknown> = {};
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.productType !== undefined) updateData.product_type = updates.productType;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.cost !== undefined) updateData.cost = updates.cost;
      if (updates.unit !== undefined) updateData.unit = updates.unit;
      if (updates.taxRate !== undefined) updateData.tax_rate = updates.taxRate;
      if (updates.isHourly !== undefined) updateData.is_hourly = updates.isHourly;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
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
    
    async toggleActive(id: string, isActive: boolean) {
      const { data, error } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
  },
  
  // ==========================================
  // GOALS / METAS
  // ==========================================
  goals: {
    async getAll(userId: string) {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    
    async create(goal: {
      userId: string;
      myCompanyId?: string;
      name: string;
      description?: string;
      goalType: string;
      targetValue: number;
      periodType: string;
      startDate: string;
      endDate: string;
    }) {
      const goalCompanyId = goal.myCompanyId || useCompanyStore.getState().selectedCompanyId;
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: goal.userId,
          name: goal.name,
          description: goal.description,
          goal_type: goal.goalType,
          target_value: goal.targetValue,
          current_value: 0,
          period_type: goal.periodType,
          start_date: goal.startDate,
          end_date: goal.endDate,
          status: 'active',
          my_company_id: goalCompanyId,
        })
        .select()
        .single();
      
      return { data, error };
    },
    
    async update(id: string, updates: {
      name?: string;
      description?: string;
      targetValue?: number;
      currentValue?: number;
      status?: string;
    }) {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.targetValue !== undefined) updateData.target_value = updates.targetValue;
      if (updates.currentValue !== undefined) updateData.current_value = updates.currentValue;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        if (updates.status === 'achieved') {
          updateData.achieved_at = new Date().toISOString();
        }
      }
      
      const { data, error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async updateProgress(id: string, currentValue: number) {
      const { data: goal } = await this.getById(id);
      let status = 'active';
      let achievedAt = null;
      
      if (goal && currentValue >= goal.target_value) {
        status = 'achieved';
        achievedAt = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('goals')
        .update({
          current_value: currentValue,
          status,
          achieved_at: achievedAt,
        })
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);
      
      return { error };
    },
  },
  
  // ==========================================
  // AUTOMATIONS
  // ==========================================
  automations: {
    async getAll(userId: string) {
      const { data, error } = await supabase
        .from('automations')
        .select(`
          *,
          steps:automation_steps(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('automations')
        .select(`
          *,
          steps:automation_steps(*),
          logs:automation_logs(*)
        `)
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    
    async create(automation: {
      userId: string;
      myCompanyId?: string;
      name: string;
      description?: string;
      triggerType: string;
      triggerConditions?: Record<string, unknown>;
      steps?: Array<{
        actionType: string;
        actionConfig: Record<string, unknown>;
        delayMinutes?: number;
      }>;
    }) {
      const autoCompanyId = automation.myCompanyId || useCompanyStore.getState().selectedCompanyId;
      const { data: automationData, error: automationError } = await supabase
        .from('automations')
        .insert({
          user_id: automation.userId,
          name: automation.name,
          description: automation.description,
          trigger_type: automation.triggerType,
          trigger_conditions: automation.triggerConditions || {},
          is_active: true,
          my_company_id: autoCompanyId,
        })
        .select()
        .single();
      
      if (automationError || !automationData) return { data: null, error: automationError };
      
      // Create steps if provided
      if (automation.steps && automation.steps.length > 0) {
        const stepsToInsert = automation.steps.map((step, index) => ({
          automation_id: automationData.id,
          step_order: index,
          action_type: step.actionType,
          action_config: step.actionConfig,
          delay_minutes: step.delayMinutes,
        }));
        
        await supabase.from('automation_steps').insert(stepsToInsert);
      }
      
      return { data: automationData, error: null };
    },
    
    async update(id: string, updates: {
      name?: string;
      description?: string;
      triggerConditions?: Record<string, unknown>;
      isActive?: boolean;
    }) {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.triggerConditions !== undefined) updateData.trigger_conditions = updates.triggerConditions;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      const { data, error } = await supabase
        .from('automations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async toggleActive(id: string, isActive: boolean) {
      const { data, error } = await supabase
        .from('automations')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);
      
      return { error };
    },
    
    async getLogs(automationId: string) {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('started_at', { ascending: false })
        .limit(50);
      
      return { data, error };
    },
  },

  // ==========================================
  // TEAM MEMBERS / EQUIPO
  // ==========================================
  team: {
    async getAll(userId: string) {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    },
    
    async getActive(userId: string) {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('first_name', { ascending: true });
      
      return { data, error };
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', id)
        .single();
      
      return { data, error };
    },
    
    async create(member: {
      userId: string;
      myCompanyId?: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      memberType: 'partner' | 'employee' | 'contractor' | 'freelancer' | 'intern';
      contractType: 'permanent' | 'temporary' | 'project' | 'hourly' | 'commission';
      jobTitle?: string;
      department?: string;
      startDate?: string;
      endDate?: string;
      salary?: number;
      salaryType?: string;
      hourlyRate?: number;
      commissionPercent?: number;
      notes?: string;
    }) {
      const memberCompanyId = member.myCompanyId || useCompanyStore.getState().selectedCompanyId;
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          user_id: member.userId,
          first_name: member.firstName,
          last_name: member.lastName,
          email: member.email,
          phone: member.phone,
          member_type: member.memberType,
          contract_type: member.contractType,
          status: 'active',
          job_title: member.jobTitle,
          department: member.department,
          start_date: member.startDate,
          end_date: member.endDate,
          salary: member.salary,
          salary_type: member.salaryType || 'monthly',
          hourly_rate: member.hourlyRate,
          commission_percent: member.commissionPercent,
          notes: member.notes,
          my_company_id: memberCompanyId,
        })
        .select()
        .single();
      
      return { data, error };
    },
    
    async update(id: string, updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      memberType?: string;
      contractType?: string;
      status?: string;
      jobTitle?: string;
      department?: string;
      startDate?: string;
      endDate?: string;
      salary?: number;
      salaryType?: string;
      hourlyRate?: number;
      commissionPercent?: number;
      notes?: string;
      permissions?: Record<string, boolean>;
    }) {
      const updateData: Record<string, unknown> = {};
      if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
      if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.memberType !== undefined) updateData.member_type = updates.memberType;
      if (updates.contractType !== undefined) updateData.contract_type = updates.contractType;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.jobTitle !== undefined) updateData.job_title = updates.jobTitle;
      if (updates.department !== undefined) updateData.department = updates.department;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.salary !== undefined) updateData.salary = updates.salary;
      if (updates.salaryType !== undefined) updateData.salary_type = updates.salaryType;
      if (updates.hourlyRate !== undefined) updateData.hourly_rate = updates.hourlyRate;
      if (updates.commissionPercent !== undefined) updateData.commission_percent = updates.commissionPercent;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
      
      const { data, error } = await supabase
        .from('team_members')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async updateStatus(id: string, status: 'active' | 'inactive' | 'pending' | 'on_leave' | 'terminated') {
      const { data, error } = await supabase
        .from('team_members')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      return { data, error };
    },
    
    async delete(id: string) {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);
      
      return { error };
    },

    // Horas trabajadas
    async logHours(entry: {
      teamMemberId: string;
      userId: string;
      workDate: string;
      hoursWorked: number;
      projectName?: string;
      description?: string;
      hourlyRate?: number;
    }) {
      const { data, error } = await supabase
        .from('team_member_hours')
        .insert({
          team_member_id: entry.teamMemberId,
          user_id: entry.userId,
          work_date: entry.workDate,
          hours_worked: entry.hoursWorked,
          project_name: entry.projectName,
          description: entry.description,
          hourly_rate: entry.hourlyRate,
        })
        .select()
        .single();
      
      return { data, error };
    },

    async getHours(teamMemberId: string, startDate?: string, endDate?: string) {
      let query = supabase
        .from('team_member_hours')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .order('work_date', { ascending: false });
      
      if (startDate) query = query.gte('work_date', startDate);
      if (endDate) query = query.lte('work_date', endDate);
      
      const { data, error } = await query;
      return { data, error };
    },

    // Pagos
    async createPayment(payment: {
      teamMemberId: string;
      userId: string;
      paymentType: string;
      grossAmount: number;
      deductions?: number;
      periodStart?: string;
      periodEnd?: string;
      reference?: string;
      notes?: string;
    }) {
      const { data, error } = await supabase
        .from('team_member_payments')
        .insert({
          team_member_id: payment.teamMemberId,
          user_id: payment.userId,
          payment_type: payment.paymentType,
          gross_amount: payment.grossAmount,
          deductions: payment.deductions || 0,
          period_start: payment.periodStart,
          period_end: payment.periodEnd,
          reference: payment.reference,
          notes: payment.notes,
          status: 'pending',
        })
        .select()
        .single();
      
      return { data, error };
    },

    async getPayments(teamMemberId: string) {
      const { data, error } = await supabase
        .from('team_member_payments')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .order('created_at', { ascending: false });
      
      return { data, error };
    },

    async markPaymentPaid(paymentId: string) {
      const { data, error } = await supabase
        .from('team_member_payments')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();
      
      return { data, error };
    },
  },

  // ==========================================
  // CLIENT LIFETIME ENGINE
  // ==========================================

  clientLifetime: {
    /**
     * Calculate LTV, churn risk, and revenue forecast for a client.
     * Uses existing incomes + opportunities tables — no new tables needed.
     */
    async getMetrics(clientId: string): Promise<{
      clientId: string;
      ltv: number;
      avgMonthlyRevenue: number;
      churnRisk: 'low' | 'medium' | 'high';
      revenueForcast30d: number;
      revenueForcast90d: number;
      totalPayments: number;
      firstPaymentDate: string | null;
      lastPaymentDate: string | null;
      monthsActive: number;
    }> {
      // Fetch all received incomes for this client
      const { data: incomes } = await supabase
        .from('incomes')
        .select('amount, payment_date, created_at')
        .eq('client_id', clientId)
        .eq('status', 'received')
        .order('payment_date', { ascending: true });

      const payments = incomes || [];
      const totalLTV = payments.reduce((sum, i) => sum + (i.amount || 0), 0);
      const totalPayments = payments.length;

      // Calculate dates
      const firstDate = payments[0]?.payment_date || payments[0]?.created_at || null;
      const lastDate = payments.length > 0
        ? payments[payments.length - 1]?.payment_date || payments[payments.length - 1]?.created_at
        : null;

      // Months active
      let monthsActive = 0;
      if (firstDate) {
        const first = new Date(firstDate);
        const now = new Date();
        monthsActive = Math.max(1, Math.round(
          (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
      }

      const avgMonthlyRevenue = monthsActive > 0 ? totalLTV / monthsActive : 0;

      // Churn risk based on days since last payment
      let churnRisk: 'low' | 'medium' | 'high' = 'low';
      if (lastDate) {
        const daysSinceLast = Math.round(
          (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLast > 90) churnRisk = 'high';
        else if (daysSinceLast > 45) churnRisk = 'medium';
      } else {
        churnRisk = 'high'; // No payments at all
      }

      // Forecast based on average monthly revenue
      const revenueForcast30d = avgMonthlyRevenue;
      const revenueForcast90d = avgMonthlyRevenue * 3;

      return {
        clientId,
        ltv: Math.round(totalLTV * 100) / 100,
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue * 100) / 100,
        churnRisk,
        revenueForcast30d: Math.round(revenueForcast30d * 100) / 100,
        revenueForcast90d: Math.round(revenueForcast90d * 100) / 100,
        totalPayments,
        firstPaymentDate: firstDate,
        lastPaymentDate: lastDate,
        monthsActive,
      };
    },

    /**
     * Get top clients by LTV.
     */
    async getTopClients(companyId: string, limit = 10): Promise<{
      clientId: string;
      clientName: string;
      ltv: number;
      churnRisk: string;
    }[]> {
      // Get all clients (contacts with type='client')
      const { data: clients } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('my_company_id', companyId)
        .eq('type', 'client')
        .limit(100);

      if (!clients || clients.length === 0) return [];

      // Calculate LTV for each client
      const results = await Promise.all(
        clients.map(async (c) => {
          const metrics = await enterpriseHelpers.clientLifetime.getMetrics(c.id);
          return {
            clientId: c.id,
            clientName: `${c.first_name} ${c.last_name || ''}`.trim(),
            ltv: metrics.ltv,
            churnRisk: metrics.churnRisk,
          };
        })
      );

      return results
        .sort((a, b) => b.ltv - a.ltv)
        .slice(0, limit);
    },

    /**
     * Get clients at risk of churn (high risk).
     */
    async getChurnRiskClients(companyId: string): Promise<{
      clientId: string;
      clientName: string;
      ltv: number;
      daysSinceLastPayment: number;
    }[]> {
      const { data: clients } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('my_company_id', companyId)
        .eq('type', 'client')
        .limit(100);

      if (!clients || clients.length === 0) return [];

      const results = await Promise.all(
        clients.map(async (c) => {
          const metrics = await enterpriseHelpers.clientLifetime.getMetrics(c.id);
          if (metrics.churnRisk !== 'high') return null;

          const daysSince = metrics.lastPaymentDate
            ? Math.round((Date.now() - new Date(metrics.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          return {
            clientId: c.id,
            clientName: `${c.first_name} ${c.last_name || ''}`.trim(),
            ltv: metrics.ltv,
            daysSinceLastPayment: daysSince,
          };
        })
      );

      return results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.daysSinceLastPayment - a.daysSinceLastPayment);
    },
  },

  // ==========================================
  // MARKET SCANNER
  // ==========================================

  marketScanner: {
    /**
     * Get historical market snapshots for a company.
     */
    async getSnapshots(companyId: string, filters?: { city?: string; businessType?: string }) {
      let query = supabase
        .from('market_snapshots')
        .select('*')
        .eq('my_company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.city) query = query.eq('city', filters.city);
      if (filters?.businessType) query = query.eq('business_type', filters.businessType);

      const { data, error } = await query.limit(50);
      return { data, error };
    },

    /**
     * Get market evolution for a specific city+type over time.
     */
    async getEvolution(companyId: string, city: string, businessType: string) {
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('total_found, no_website, broken_website, slow_website, good_website, avg_digital_score, created_at')
        .eq('my_company_id', companyId)
        .eq('city', city)
        .eq('business_type', businessType)
        .order('created_at', { ascending: true })
        .limit(20);

      return { data, error };
    },
  },
};
