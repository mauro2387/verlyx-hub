// Utility to create notifications from anywhere in the app

interface CreateNotificationParams {
  userId: string;
  type: 'task' | 'project' | 'payment' | 'deal' | 'system' | 'reminder' | 'mention' | 'contact' | 'deadline' | 'message';
  title: string;
  message: string;
  actionUrl?: string;
  relatedType?: string;
  relatedId?: string;
  relatedName?: string;
  metadata?: any;
}

export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        related_type: params.relatedType,
        related_id: params.relatedId,
        related_name: params.relatedName,
        metadata: params.metadata || {},
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create notification');
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// Common notification templates

export const NotificationTemplates = {
  taskAssigned: (userId: string, taskName: string, projectName?: string) => 
    createNotification({
      userId,
      type: 'task',
      title: 'Tarea asignada',
      message: projectName 
        ? `Se te ha asignado la tarea "${taskName}" en ${projectName}`
        : `Se te ha asignado la tarea "${taskName}"`,
      actionUrl: '/tasks',
      relatedType: 'task',
      relatedName: taskName,
    }),

  paymentReceived: (userId: string, amount: number, currency: string, clientName: string) =>
    createNotification({
      userId,
      type: 'payment',
      title: 'Pago recibido',
      message: `Se ha recibido un pago de ${currency} ${amount.toLocaleString()} de ${clientName}`,
      actionUrl: '/payments',
      relatedType: 'payment',
      relatedName: clientName,
    }),

  dealUpdated: (userId: string, dealName: string, newStage: string) =>
    createNotification({
      userId,
      type: 'deal',
      title: 'Oportunidad actualizada',
      message: `La oportunidad "${dealName}" ha pasado a etapa de ${newStage}`,
      actionUrl: '/deals',
      relatedType: 'deal',
      relatedName: dealName,
    }),

  projectDeadline: (userId: string, projectName: string, daysLeft: number) =>
    createNotification({
      userId,
      type: 'deadline',
      title: 'Deadline próximo',
      message: `El proyecto "${projectName}" tiene deadline en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
      actionUrl: '/projects',
      relatedType: 'project',
      relatedName: projectName,
    }),

  userMentioned: (userId: string, mentionedBy: string, context: string) =>
    createNotification({
      userId,
      type: 'mention',
      title: 'Te mencionaron',
      message: `${mentionedBy} te mencionó en ${context}`,
      actionUrl: '/tasks',
    }),

  reminder: (userId: string, title: string, message: string, actionUrl?: string) =>
    createNotification({
      userId,
      type: 'reminder',
      title,
      message,
      actionUrl,
    }),

  systemUpdate: (userId: string, version: string, features: string) =>
    createNotification({
      userId,
      type: 'system',
      title: 'Actualización del sistema',
      message: `Verlyx Hub se ha actualizado a la versión ${version}. ${features}`,
    }),

  newContact: (userId: string, contactName: string, source?: string) =>
    createNotification({
      userId,
      type: 'contact',
      title: 'Nuevo contacto',
      message: source 
        ? `Nuevo contacto agregado: ${contactName} (desde ${source})`
        : `Nuevo contacto agregado: ${contactName}`,
      actionUrl: '/contacts',
      relatedType: 'contact',
      relatedName: contactName,
    }),

  newMessage: (userId: string, from: string, preview: string) =>
    createNotification({
      userId,
      type: 'message',
      title: `Mensaje de ${from}`,
      message: preview,
      actionUrl: '/messages',
    }),
};
