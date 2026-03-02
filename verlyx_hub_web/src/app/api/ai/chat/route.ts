// ============================================================
// AI CHAT ROUTE — OpenAI via AI SDK
// Verlyx Hub Enterprise Architecture
// ============================================================
// Uses the Vercel AI SDK with OpenAI provider.
// Replaced Anthropic/Claude with OpenAI GPT-4.1.
// ============================================================

import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ==========================================
// CONTEXT BUILDER — fetches real data from Supabase
// ==========================================

async function buildBusinessContext(userId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // Parallel fetch all needed data (including new leads & opportunities)
  const [
    companiesRes,
    dealsRes,
    tasksRes,
    projectsRes,
    incomesRes,
    expensesRes,
    accountsRes,
    leadsRes,
    opportunitiesRes,
  ] = await Promise.all([
    supabase.from('my_companies').select('id, name, currency').eq('user_id', userId),
    supabase.from('deals').select('id, name, stage, value, currency, expected_close_date, contact_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('tasks').select('id, title, status, priority, due_date, project_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('projects').select('id, name, status, budget, progress_percentage, start_date, end_date').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    supabase.from('incomes').select('id, description, amount, currency, status, due_date, payment_date').gte('created_at', monthStart).lte('created_at', monthEnd).limit(50),
    supabase.from('expenses').select('id, description, amount, currency, status, payment_date').gte('created_at', monthStart).lte('created_at', monthEnd).limit(50),
    supabase.from('accounts').select('id, name, type, currency, current_balance').limit(20),
    supabase.from('leads').select('id, company_name, status, source, prospect_score, contact_attempts, created_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('opportunities').select('id, title, stage, tentative_amount, final_amount, probability, currency, next_action_date').order('created_at', { ascending: false }).limit(30),
  ]);

  const companies = companiesRes.data || [];
  const deals = dealsRes.data || [];
  const tasks = tasksRes.data || [];
  const projects = projectsRes.data || [];
  const incomes = incomesRes.data || [];
  const expenses = expensesRes.data || [];
  const accounts = accountsRes.data || [];
  const leads = leadsRes.data || [];
  const opportunities = opportunitiesRes.data || [];

  // Calculate summaries
  const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));
  const wonDeals = deals.filter(d => d.stage === 'won');
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  const pendingTasks = tasks.filter(t => ['todo', 'in_progress'].includes(t.status));
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now);
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  const activeProjects = projects.filter(p => ['planning', 'in_progress'].includes(p.status));

  const totalIncome = incomes.filter(i => i.status === 'received').reduce((sum, i) => sum + (i.amount || 0), 0);
  const pendingIncome = incomes.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

  const overdueIncomes = incomes.filter(i => i.status === 'pending' && i.due_date && new Date(i.due_date) < now);

  // Leads stats
  const activeLeads = leads.filter((l: any) => l.status !== 'not_interested');
  const respondedLeads = leads.filter((l: any) => l.status === 'responded');

  // Opportunities stats
  const activeOpps = opportunities.filter((o: any) => !['won', 'lost'].includes(o.stage));
  const oppPipelineValue = activeOpps.reduce((sum: number, o: any) => sum + (o.tentative_amount || o.final_amount || 0), 0);

  return `
CONTEXTO DEL NEGOCIO (datos en tiempo real de Supabase):
═══════════════════════════════════════════

Fecha actual: ${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Empresas: ${companies.map(c => `${c.name} (${c.currency})`).join(', ') || 'Sin empresas'}

── FINANZAS DEL MES ──
Ingresos cobrados: $${totalIncome.toLocaleString()}
Ingresos pendientes: $${pendingIncome.toLocaleString()} (${incomes.filter(i => i.status === 'pending').length} facturas)
Gastos: $${totalExpense.toLocaleString()}
Resultado neto: $${(totalIncome - totalExpense).toLocaleString()}
Balance total cuentas: $${totalBalance.toLocaleString()}
Cuentas: ${accounts.map(a => `${a.name}: $${(a.current_balance || 0).toLocaleString()} ${a.currency}`).join(' | ') || 'Sin cuentas'}
${overdueIncomes.length > 0 ? `⚠️ Ingresos vencidos: ${overdueIncomes.length} por $${overdueIncomes.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}` : ''}

── PROSPECCIÓN (LEADS) ──
Total leads: ${leads.length}
Leads activos: ${activeLeads.length}
Respondidos (listos para conversión): ${respondedLeads.length}
Score promedio: ${activeLeads.length > 0 ? Math.round(activeLeads.reduce((s: number, l: any) => s + (l.prospect_score || 0), 0) / activeLeads.length) : 0}/100
${respondedLeads.length > 0 ? `🟢 Leads listos: ${respondedLeads.slice(0, 3).map((l: any) => `"${l.company_name}" (score: ${l.prospect_score})`).join(', ')}` : ''}

── PIPELINE OPORTUNIDADES ──
Oportunidades activas: ${activeOpps.length} por $${oppPipelineValue.toLocaleString()}
${['qualified', 'proposal', 'negotiation'].map(stage => {
    const stageOpps = activeOpps.filter((o: any) => o.stage === stage);
    return `${stage}: ${stageOpps.length} ($${stageOpps.reduce((s: number, o: any) => s + (o.tentative_amount || 0), 0).toLocaleString()})`;
  }).join(' | ')}

── PIPELINE CRM (LEGACY) ──
Deals activos: ${activeDeals.length} por $${pipelineValue.toLocaleString()}
Deals ganados (histórico): ${wonDeals.length} por $${wonValue.toLocaleString()}
Pipeline por etapa: ${['lead', 'qualified', 'proposal', 'negotiation'].map(stage => {
    const stageDeals = activeDeals.filter(d => d.stage === stage);
    return `${stage}: ${stageDeals.length} ($${stageDeals.reduce((s, d) => s + (d.value || 0), 0).toLocaleString()})`;
  }).join(' | ')}
${activeDeals.length > 0 ? `Top deals: ${activeDeals.slice(0, 5).map(d => `"${d.name}" ($${(d.value || 0).toLocaleString()}, ${d.stage})`).join('; ')}` : ''}

── PROYECTOS ──
Proyectos activos: ${activeProjects.length}
${activeProjects.slice(0, 5).map(p => `  • "${p.name}" — ${p.status} (${p.progress_percentage || 0}% completado, presupuesto: $${(p.budget || 0).toLocaleString()})`).join('\n') || '  Sin proyectos activos'}

── TAREAS ──
Tareas pendientes: ${pendingTasks.length}
Tareas atrasadas: ${overdueTasks.length}
Tareas bloqueadas: ${blockedTasks.length}
${overdueTasks.length > 0 ? `⚠️ Atrasadas: ${overdueTasks.slice(0, 5).map(t => `"${t.title}" (vence: ${t.due_date})`).join('; ')}` : ''}
`.trim();
}

// ==========================================
// TOOL DEFINITIONS
// ==========================================

const aiTools = {
  get_financial_summary: tool({
    description: 'Obtiene un resumen financiero del mes actual incluyendo ingresos, gastos, balance y facturas pendientes',
    inputSchema: z.object({
      month: z.number().optional().describe('Mes (1-12). Default: mes actual'),
      year: z.number().optional().describe('Año. Default: año actual'),
    }),
    execute: async ({ month, year }) => {
      const now = new Date();
      const m = (month || now.getMonth() + 1) - 1;
      const y = year || now.getFullYear();
      const start = new Date(y, m, 1).toISOString();
      const end = new Date(y, m + 1, 0).toISOString();

      const [incomes, expenses, accounts] = await Promise.all([
        supabase.from('incomes').select('amount, status, currency').gte('created_at', start).lte('created_at', end),
        supabase.from('expenses').select('amount, status, currency').gte('created_at', start).lte('created_at', end),
        supabase.from('accounts').select('name, current_balance, currency'),
      ]);

      const totalIncome = (incomes.data || []).filter(i => i.status === 'received').reduce((s, i) => s + i.amount, 0);
      const pendingIncome = (incomes.data || []).filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
      const totalExpense = (expenses.data || []).reduce((s, e) => s + e.amount, 0);
      const totalBalance = (accounts.data || []).reduce((s, a) => s + (a.current_balance || 0), 0);

      return {
        periodo: `${y}-${String(m + 1).padStart(2, '0')}`,
        ingresos_cobrados: totalIncome,
        ingresos_pendientes: pendingIncome,
        gastos: totalExpense,
        resultado_neto: totalIncome - totalExpense,
        margen: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        balance_total: totalBalance,
        cuentas: (accounts.data || []).map(a => ({ nombre: a.name, balance: a.current_balance, moneda: a.currency })),
      };
    },
  }),

  get_pending_items: tool({
    description: 'Lista items urgentes: facturas vencidas, tareas atrasadas, follow-ups pendientes',
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date().toISOString();
      const [overdueIncomes, overdueTasks, urgentTasks] = await Promise.all([
        supabase.from('incomes').select('id, description, amount, due_date, client_name').eq('status', 'pending').lt('due_date', now).order('due_date').limit(10),
        supabase.from('tasks').select('id, title, due_date, priority, status').in('status', ['todo', 'in_progress']).lt('due_date', now).order('due_date').limit(10),
        supabase.from('tasks').select('id, title, due_date, priority').eq('priority', 'urgent').in('status', ['todo', 'in_progress']).limit(10),
      ]);

      return {
        facturas_vencidas: (overdueIncomes.data || []).map(i => ({
          id: i.id, descripcion: i.description, monto: i.amount, vencimiento: i.due_date, cliente: i.client_name,
        })),
        tareas_atrasadas: (overdueTasks.data || []).map(t => ({
          id: t.id, titulo: t.title, vencimiento: t.due_date, prioridad: t.priority,
        })),
        tareas_urgentes: (urgentTasks.data || []).map(t => ({
          id: t.id, titulo: t.title, vencimiento: t.due_date,
        })),
      };
    },
  }),

  create_task: tool({
    description: 'Crea una nueva tarea en el sistema',
    inputSchema: z.object({
      title: z.string().describe('Título de la tarea'),
      description: z.string().optional().describe('Descripción detallada'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      due_date: z.string().optional().describe('Fecha de vencimiento ISO'),
      project_id: z.string().optional().describe('ID del proyecto asociado'),
    }),
    execute: async ({ title, description, priority, due_date, project_id }) => {
      const { data, error } = await supabase.from('tasks').insert({
        title,
        description,
        priority,
        status: 'todo',
        due_date,
        project_id,
      }).select().single();

      if (error) return { success: false, error: error.message };
      return { success: true, task_id: data.id, message: `Tarea "${title}" creada exitosamente` };
    },
  }),

  move_deal_stage: tool({
    description: 'Mueve un deal a una nueva etapa del pipeline. Use deal ID o nombre para encontrarlo.',
    inputSchema: z.object({
      deal_name: z.string().describe('Nombre o parte del nombre del deal a buscar'),
      new_stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
      reason: z.string().optional().describe('Razón del cambio de etapa'),
    }),
    execute: async ({ deal_name, new_stage, reason }) => {
      // Find deal by name
      const { data: deals } = await supabase.from('deals').select('id, name, stage, value').ilike('name', `%${deal_name}%`).limit(1);
      if (!deals || deals.length === 0) return { success: false, error: `No se encontró deal con nombre "${deal_name}"` };

      const deal = deals[0];
      const { error } = await supabase.from('deals').update({ stage: new_stage, notes: reason }).eq('id', deal.id);
      if (error) return { success: false, error: error.message };

      return {
        success: true,
        deal_id: deal.id,
        deal_name: deal.name,
        old_stage: deal.stage,
        new_stage,
        value: deal.value,
        message: `Deal "${deal.name}" movido de ${deal.stage} a ${new_stage}`,
      };
    },
  }),

  mark_income_received: tool({
    description: 'Marca un ingreso pendiente como cobrado/recibido',
    inputSchema: z.object({
      income_description: z.string().describe('Descripción o parte de la descripción del ingreso'),
      received_date: z.string().optional().describe('Fecha de cobro ISO. Default: hoy'),
    }),
    execute: async ({ income_description, received_date }) => {
      const { data: incomes } = await supabase.from('incomes').select('id, description, amount, status')
        .eq('status', 'pending').ilike('description', `%${income_description}%`).limit(1);

      if (!incomes || incomes.length === 0) return { success: false, error: `No se encontró ingreso pendiente con "${income_description}"` };

      const income = incomes[0];
      const { error } = await supabase.from('incomes').update({
        status: 'received',
        payment_date: received_date || new Date().toISOString().split('T')[0],
      }).eq('id', income.id);

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        income_id: income.id,
        amount: income.amount,
        message: `Ingreso "${income.description}" por $${income.amount.toLocaleString()} marcado como cobrado`,
      };
    },
  }),

  create_calendar_event: tool({
    description: 'Crea un evento en el calendario',
    inputSchema: z.object({
      title: z.string().describe('Título del evento'),
      start_date: z.string().describe('Fecha y hora de inicio ISO'),
      end_date: z.string().optional().describe('Fecha y hora de fin ISO'),
      type: z.enum(['meeting', 'task', 'reminder', 'deadline', 'payment', 'call', 'other']).default('meeting'),
      description: z.string().optional(),
      location: z.string().optional(),
    }),
    execute: async ({ title, start_date, end_date, type, description, location }) => {
      const endDate = end_date || new Date(new Date(start_date).getTime() + 3600000).toISOString();
      const { data, error } = await supabase.from('calendar_events').insert({
        title, start_date, end_date: endDate, type, description, location, status: 'pending', all_day: false,
      }).select().single();

      if (error) return { success: false, error: error.message };
      return { success: true, event_id: data.id, message: `Evento "${title}" creado para ${new Date(start_date).toLocaleDateString('es-ES')}` };
    },
  }),

  get_project_status: tool({
    description: 'Obtiene el estado detallado de un proyecto incluyendo tareas y progreso',
    inputSchema: z.object({
      project_name: z.string().describe('Nombre o parte del nombre del proyecto'),
    }),
    execute: async ({ project_name }) => {
      const { data: projects } = await supabase.from('projects').select('*').ilike('name', `%${project_name}%`).limit(1);
      if (!projects || projects.length === 0) return { error: `No se encontró proyecto "${project_name}"` };

      const project = projects[0];
      const { data: tasks } = await supabase.from('tasks').select('id, title, status, priority, due_date').eq('project_id', project.id);

      const taskStats = {
        total: (tasks || []).length,
        completadas: (tasks || []).filter(t => t.status === 'done').length,
        pendientes: (tasks || []).filter(t => ['todo', 'in_progress'].includes(t.status)).length,
        bloqueadas: (tasks || []).filter(t => t.status === 'blocked').length,
      };

      return {
        nombre: project.name,
        estado: project.status,
        progreso: project.progress_percentage || 0,
        presupuesto: project.budget,
        gastado: project.spent_amount || 0,
        inicio: project.start_date,
        fin: project.end_date,
        tareas: taskStats,
        tareas_detalle: (tasks || []).slice(0, 10).map(t => ({ titulo: t.title, estado: t.status, prioridad: t.priority, vence: t.due_date })),
      };
    },
  }),

  // NEW: Lead management tools
  get_leads_summary: tool({
    description: 'Obtiene resumen de leads/prospectos con estadísticas por estado y fuente',
    inputSchema: z.object({
      status: z.enum(['not_contacted', 'contacted', 'waiting_response', 'responded', 'not_interested']).optional().describe('Filtrar por estado'),
    }),
    execute: async ({ status }) => {
      let query = supabase.from('leads').select('id, company_name, status, source, prospect_score, contact_attempts, created_at');
      if (status) query = query.eq('status', status);
      const { data: allLeads, error } = await query.order('prospect_score', { ascending: false }).limit(50);
      
      if (error) return { error: error.message };
      const leadList = allLeads || [];
      
      return {
        total: leadList.length,
        por_estado: {
          no_contactados: leadList.filter(l => l.status === 'not_contacted').length,
          contactados: leadList.filter(l => l.status === 'contacted').length,
          esperando_respuesta: leadList.filter(l => l.status === 'waiting_response').length,
          respondidos: leadList.filter(l => l.status === 'responded').length,
          no_interesados: leadList.filter(l => l.status === 'not_interested').length,
        },
        score_promedio: leadList.length > 0 ? Math.round(leadList.reduce((s, l) => s + (l.prospect_score || 0), 0) / leadList.length) : 0,
        top_leads: leadList.slice(0, 10).map(l => ({
          nombre: l.company_name,
          estado: l.status,
          fuente: l.source,
          score: l.prospect_score,
          intentos_contacto: l.contact_attempts,
        })),
      };
    },
  }),

  get_opportunities_pipeline: tool({
    description: 'Obtiene el pipeline de oportunidades con valor por etapa y probabilidad',
    inputSchema: z.object({
      stage: z.enum(['qualified', 'proposal', 'negotiation', 'won', 'lost']).optional().describe('Filtrar por etapa'),
    }),
    execute: async ({ stage }) => {
      let query = supabase.from('opportunities').select('id, title, stage, tentative_amount, final_amount, probability, currency, next_action_date, days_in_stage');
      if (stage) query = query.eq('stage', stage);
      const { data: opps, error } = await query.order('created_at', { ascending: false }).limit(50);
      
      if (error) return { error: error.message };
      const allOpps = opps || [];
      const activeO = allOpps.filter(o => !['won', 'lost'].includes(o.stage));
      
      return {
        total_activas: activeO.length,
        valor_pipeline: activeO.reduce((s, o) => s + (o.tentative_amount || o.final_amount || 0), 0),
        por_etapa: {
          qualified: allOpps.filter(o => o.stage === 'qualified').length,
          proposal: allOpps.filter(o => o.stage === 'proposal').length,
          negotiation: allOpps.filter(o => o.stage === 'negotiation').length,
          won: allOpps.filter(o => o.stage === 'won').length,
          lost: allOpps.filter(o => o.stage === 'lost').length,
        },
        top_oportunidades: activeO.slice(0, 10).map(o => ({
          titulo: o.title,
          etapa: o.stage,
          monto: o.tentative_amount || o.final_amount || 0,
          probabilidad: o.probability,
          moneda: o.currency,
          siguiente_accion: o.next_action_date,
          dias_en_etapa: o.days_in_stage,
        })),
      };
    },
  }),
};

// ==========================================
// ROUTE HANDLER
// ==========================================

export async function POST(req: Request) {
  try {
    // Validate API key exists
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'OPENAI_API_KEY no configurada. Agrega tu API key en .env.local',
          fallback: true,
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, userId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build dynamic context from Supabase
    let businessContext = '';
    try {
      businessContext = await buildBusinessContext(userId || '');
    } catch (e) {
      businessContext = 'No se pudo cargar el contexto del negocio. Responde basándote en la pregunta del usuario.';
    }

    const systemPrompt = `Eres el Asistente Operativo de Verlyx Hub, un sistema operativo empresarial. Tu rol es ayudar al CEO/gerente a tomar decisiones informadas sobre su negocio.

${businessContext}

INSTRUCCIONES:
- Responde SIEMPRE en español
- Sé conciso pero completo. Usa datos reales del contexto
- Si el usuario pregunta algo sobre el negocio, usa los datos del contexto
- Si necesitas ejecutar una acción (crear tarea, mover deal, etc.), usa las herramientas disponibles
- Formatea con bullet points y secciones claras cuando la respuesta es compleja
- Si no tienes datos suficientes, dilo honestamente
- Incluye recomendaciones proactivas cuando sea relevante
- Nunca inventes datos. Solo usa la información del contexto o la que obtengas via tools
- Para leads/prospectos, usa get_leads_summary
- Para oportunidades de ventas, usa get_opportunities_pipeline
- Si el usuario quiere convertir un lead a oportunidad, explica que el lead debe estar en estado "responded"`;

    const result = streamText({
      model: openai('gpt-4.1'),
      system: systemPrompt,
      messages,
      tools: aiTools,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error('AI Chat Error:', error);
    const message = error instanceof Error ? error.message : 'Error del servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
