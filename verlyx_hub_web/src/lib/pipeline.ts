/**
 * Pipeline Automation Module
 * ==========================
 * Implements the transactional pipeline described in Section 3.4 of the vision document.
 * When a deal moves to 'won', this module creates:
 *   1. Income (status: 'pending', amount/client from deal)
 *   2. Project (name from deal, budget = deal value)
 *   3. Onboarding task ("Enviar contrato a [cliente]", due 24h)
 *   4. CRM activity log ("Deal ganado")
 *   5. Notification to user
 */

import { db, financial, crm, supabase } from './supabase';
import { toast } from '@/components/ui/Toast';
import type { Deal, DealStage } from './types';

// ==========================================
// PIPELINE RESULT TYPES
// ==========================================

export interface PipelineResult {
  success: boolean;
  dealId: string;
  steps: PipelineStepResult[];
  summary: string;
}

export interface PipelineStepResult {
  step: string;
  success: boolean;
  entityId?: string;
  error?: string;
}

// ==========================================
// DEAL WON PIPELINE
// ==========================================

export async function executeDealWonPipeline(deal: Deal): Promise<PipelineResult> {
  const steps: PipelineStepResult[] = [];
  const companyId = deal.myCompanyId;
  const clientName = deal.clientName || deal.title;
  const amount = deal.amount || deal.value || 0;
  const currency = deal.currency || 'USD';

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // Show initial notification
  toast.pipeline(
    'Pipeline activado',
    `Deal "${deal.title}" ganado — ejecutando automatizaciones...`
  );

  // ---- Step 0: Convert contact to client ----
  try {
    if (deal.clientId) {
      const { error } = await supabase
        .from('contacts')
        .update({ type: 'client', status: 'won' })
        .eq('id', deal.clientId);

      if (error) throw error;
      steps.push({ step: 'convert_to_client', success: true, entityId: deal.clientId });
    } else {
      // No contact linked — create one
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          first_name: clientName.split(' ')[0] || clientName,
          last_name: clientName.split(' ').slice(1).join(' ') || '',
          type: 'client',
          status: 'won',
          my_company_id: companyId,
          user_id: userId,
        })
        .select('id')
        .single();

      if (error) throw error;
      steps.push({ step: 'convert_to_client', success: true, entityId: newContact?.id });

      // Link the new contact back to the deal
      if (newContact?.id) {
        await supabase
          .from('deals')
          .update({ client_id: newContact.id })
          .eq('id', deal.id);
      }
    }
  } catch (err: any) {
    steps.push({ step: 'convert_to_client', success: false, error: err?.message || 'Error convirtiendo contacto a cliente' });
  }

  // ---- Step 1: Create Income ----
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30-day payment terms default

    const { data: income, error } = await financial.incomes.create({
      my_company_id: companyId || '',
      description: `Ingreso de deal: ${deal.title}`,
      amount,
      currency,
      client_id: deal.clientId || null,
      client_name: clientName || null,
      deal_id: deal.id,
      status: 'pending',
      due_date: dueDate.toISOString().split('T')[0],
      invoice_date: new Date().toISOString().split('T')[0],
      notes: `Auto-generado por pipeline. Deal: ${deal.title}. Ganado el ${new Date().toLocaleDateString('es-ES')}`,
      is_recurring: false,
      tags: ['auto-pipeline', 'deal-won'],
    });

    if (error) throw error;
    steps.push({ step: 'income', success: true, entityId: income?.id });
  } catch (err: any) {
    steps.push({ step: 'income', success: false, error: err?.message || 'Error creando ingreso' });
  }

  // ---- Step 2: Create Project ----
  let projectId: string | undefined;
  try {
    const { data: project, error } = await db.projects.create({
      name: deal.title,
      description: `Proyecto generado automáticamente del deal "${deal.title}".\nCliente: ${clientName}\nValor: ${currency} ${amount.toLocaleString()}`,
      status: 'planning',
      priority: 'high',
      budget: amount,
      currency,
      my_company_id: companyId,
      client_id: deal.clientId || undefined,
      deal_id: deal.id,
      start_date: new Date().toISOString().split('T')[0],
    } as any);

    if (error) throw error;
    projectId = project?.id;
    steps.push({ step: 'project', success: true, entityId: projectId });
  } catch (err: any) {
    steps.push({ step: 'project', success: false, error: err?.message || 'Error creando proyecto' });
  }

  // ---- Step 3: Create Onboarding Task ----
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Due in 24 hours

    const { data: task, error } = await db.tasks.create({
      title: `Enviar contrato a ${clientName}`,
      description: `Tarea de onboarding auto-generada.\n\n- Deal: ${deal.title}\n- Monto: ${currency} ${amount.toLocaleString()}\n- Acción requerida: Enviar contrato al cliente y confirmar recepción.`,
      status: 'todo',
      priority: 'urgent',
      project_id: projectId || undefined,
      deal_id: deal.id,
      client_id: deal.clientId || undefined,
      assigned_to: userId || undefined,
      due_date: dueDate.toISOString(),
      my_company_id: companyId,
    } as any);

    if (error) throw error;
    steps.push({ step: 'task', success: true, entityId: task?.id });
  } catch (err: any) {
    steps.push({ step: 'task', success: false, error: err?.message || 'Error creando tarea' });
  }

  // ---- Step 4: Log CRM Activity ----
  try {
    if (deal.clientId && companyId) {
      const { error } = await crm.activities.create({
        myCompanyId: companyId,
        contactId: deal.clientId,
        activityType: 'deal_won',
        direction: 'outbound',
        sentiment: 'positive',
        subject: `Deal ganado: ${deal.title}`,
        description: `El deal "${deal.title}" fue cerrado exitosamente.\nMonto: ${currency} ${amount.toLocaleString()}\nResponsable: ${user?.email || 'N/A'}`,
        outcome: 'closed_won',
        dealId: deal.id,
        projectId: projectId,
        createdBy: userId,
        assignedTo: userId,
      });
      if (error) throw error;
      steps.push({ step: 'crm_activity', success: true });
    } else {
      steps.push({ step: 'crm_activity', success: true, error: 'Skipped: no clientId or companyId' });
    }
  } catch (err: any) {
    steps.push({ step: 'crm_activity', success: false, error: err?.message || 'Error registrando actividad' });
  }

  // ---- Step 5: Create Notification ----
  try {
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'deal',
        title: `🎉 Deal ganado: ${deal.title}`,
        message: `El deal "${deal.title}" por ${currency} ${amount.toLocaleString()} fue cerrado exitosamente. Se creó un ingreso pendiente, un proyecto y una tarea de onboarding automáticamente.`,
        is_read: false,
        related_type: 'deal',
        related_id: deal.id,
        related_name: deal.title,
        metadata: {
          pipeline_steps: steps.map(s => ({ step: s.step, success: s.success })),
          amount,
          currency,
        },
      });
      steps.push({ step: 'notification', success: true });
    }
  } catch (err: any) {
    steps.push({ step: 'notification', success: false, error: err?.message || 'Error creando notificación' });
  }

  // ---- Summary ----
  const successCount = steps.filter(s => s.success).length;
  const totalSteps = steps.length;
  const allSuccess = successCount === totalSteps;

  const result: PipelineResult = {
    success: allSuccess,
    dealId: deal.id,
    steps,
    summary: allSuccess
      ? `Pipeline completado: ${totalSteps}/${totalSteps} pasos exitosos`
      : `Pipeline parcial: ${successCount}/${totalSteps} pasos exitosos`,
  };

  // Show result toast
  if (allSuccess) {
    toast.success(
      `Deal "${deal.title}" — Pipeline completado`,
      `Contacto convertido a cliente, ingreso, proyecto, tarea y actividad CRM creados automáticamente.`
    );
  } else {
    const failedSteps = steps.filter(s => !s.success).map(s => s.step).join(', ');
    toast.warning(
      `Pipeline parcial para "${deal.title}"`,
      `${successCount}/${totalSteps} pasos completados. Fallos: ${failedSteps}`
    );
  }

  return result;
}

// ==========================================
// DEAL LOST PIPELINE
// ==========================================

export async function executeDealLostPipeline(deal: Deal): Promise<PipelineResult> {
  const steps: PipelineStepResult[] = [];
  const companyId = deal.myCompanyId;

  const { data: { user } } = await supabase.auth.getUser();

  // Log CRM activity for lost deal
  try {
    if (deal.clientId && companyId) {
      const { error } = await crm.activities.create({
        myCompanyId: companyId,
        contactId: deal.clientId,
        activityType: 'deal_lost',
        direction: 'outbound',
        sentiment: 'negative',
        subject: `Deal perdido: ${deal.title}`,
        description: `El deal "${deal.title}" fue marcado como perdido.\nMotivo: ${deal.lostReason || 'No especificado'}\nMonto perdido: ${deal.currency || 'USD'} ${(deal.amount || deal.value || 0).toLocaleString()}`,
        outcome: 'closed_lost',
        dealId: deal.id,
        createdBy: user?.id,
      });
      if (error) throw error;
      steps.push({ step: 'crm_activity', success: true });
    }
  } catch (err: any) {
    steps.push({ step: 'crm_activity', success: false, error: err?.message });
  }

  // Create follow-up task
  try {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 30); // Follow up in 30 days

    const { error } = await db.tasks.create({
      title: `Follow-up: ${deal.clientName || deal.title} (deal perdido)`,
      description: `El deal "${deal.title}" fue perdido.\nMotivo: ${deal.lostReason || 'No especificado'}\n\nHacer seguimiento en 30 días para reevaluar oportunidad.`,
      status: 'todo',
      priority: 'low',
      deal_id: deal.id,
      assigned_to: user?.id,
      due_date: followUpDate.toISOString(),
      my_company_id: companyId,
    } as any);

    if (error) throw error;
    steps.push({ step: 'follow_up_task', success: true });
  } catch (err: any) {
    steps.push({ step: 'follow_up_task', success: false, error: err?.message });
  }

  toast.info(
    `Deal "${deal.title}" — Perdido`,
    'Se registró la actividad y se creó un follow-up para 30 días.'
  );

  return {
    success: steps.every(s => s.success),
    dealId: deal.id,
    steps,
    summary: `Pipeline de deal perdido: ${steps.filter(s => s.success).length}/${steps.length} pasos`,
  };
}

// ==========================================
// MAIN PIPELINE DISPATCHER
// ==========================================

export async function onDealStageChanged(
  deal: Deal,
  oldStage: DealStage,
  newStage: DealStage
): Promise<PipelineResult | null> {
  // Only trigger on terminal stage transitions
  if (newStage === 'won' && oldStage !== 'won') {
    return executeDealWonPipeline(deal);
  }

  if (newStage === 'lost' && oldStage !== 'lost') {
    return executeDealLostPipeline(deal);
  }

  return null;
}
