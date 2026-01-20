import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  // ========== GESTIÓN DE CONVERSACIONES ==========

  async createConversation(
    userId: string,
    title: string,
    contextType: string = 'general',
  ) {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        title,
        context_type: contextType,
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating conversation: ${error.message}`);
    return data;
  }

  async getConversations(
    userId: string,
    contextType?: string,
  ) {
    const supabase = this.supabaseService.getClient();
    
    let query = supabase
      .from('ai_conversations')
      .select(`
        *,
        ai_messages(count)
      `)
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (contextType) {
      query = query.eq('context_type', contextType);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Error fetching conversations: ${error.message}`);
    return data;
  }

  async getConversation(userId: string, conversationId: string) {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('ai_conversations')
      .select(`
        *,
        ai_messages(*)
      `)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error) throw new Error(`Error fetching conversation: ${error.message}`);
    return data;
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    updates: { title?: string; isPinned?: boolean },
  ) {
    const supabase = this.supabaseService.getClient();
    
    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.isPinned !== undefined) updateData.is_pinned = updates.isPinned;

    const { data, error } = await supabase
      .from('ai_conversations')
      .update(updateData)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Error updating conversation: ${error.message}`);
    return data;
  }

  async deleteConversation(userId: string, conversationId: string) {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) throw new Error(`Error deleting conversation: ${error.message}`);
  }

  // ========== GESTIÓN DE MENSAJES ==========

  async sendMessage(userId: string, conversationId: string, content: string) {
    const supabase = this.supabaseService.getClient();
    
    // Verificar que la conversación existe y pertenece al usuario
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('*, ai_messages(*)')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convError) throw new Error(`Conversation not found`);

    // Guardar mensaje del usuario
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    });

    // Construir contexto desde mensajes anteriores
    const previousMessages = conversation.ai_messages || [];
    const contextMessages = previousMessages
      .slice(-10) // Últimos 10 mensajes
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // Obtener respuesta de OpenAI
    const systemPrompt = this.buildSystemPrompt(conversation);
    
    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...contextMessages,
        { role: 'user', content },
      ],
      max_tokens: parseInt(
        this.configService.get('OPENAI_MAX_TOKENS') || '4000',
      ),
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content || 'No pude generar una respuesta.';

    // Guardar respuesta de la IA
    const { data: aiMessage } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
      })
      .select()
      .single();

    return {
      userMessage: { role: 'user', content },
      aiMessage: { role: 'assistant', content: aiResponse, ...aiMessage },
    };
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
  ) {
    const supabase = this.supabaseService.getClient();
    
    // Verificar acceso
    const { data: conversation } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!conversation) throw new Error(`Conversation not found`);

    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Error fetching messages: ${error.message}`);
    return data;
  }

  private buildSystemPrompt(conversation: any): string {
    let prompt = `Eres un asistente inteligente para Verlyx Hub, una plataforma de gestión empresarial.

Tu función es ayudar a:
- Gestionar proyectos, tareas y documentos
- Generar y analizar PDFs (facturas, contratos, presupuestos)
- Dar sugerencias sobre organización del trabajo
- Responder preguntas sobre el sistema

Sé conciso, profesional y útil. Responde en español.`;

    if (conversation.context_type === 'project') {
      prompt += `\n\nCONTEXTO: Esta conversación está asociada a un proyecto específico. Enfócate en ayudar con tareas, planificación y organización del proyecto.`;
    }

    if (conversation.context_type === 'task') {
      prompt += `\n\nCONTEXTO: Esta conversación está asociada a una tarea específica. Ayuda a desglosar pasos, establecer prioridades y resolver bloqueos.`;
    }

    return prompt;
  }

  /**
   * Chat general con contexto del workspace
   */
  async chat(message: string, context?: string): Promise<string> {
    const systemPrompt = `Eres un asistente inteligente para Verlyx Hub, una plataforma de gestión empresarial.
${context ? `\n\nCONTEXTO DEL USUARIO:\n${context}` : ''}

Tu función es ayudar a:
- Gestionar proyectos, tareas y documentos
- Generar y analizar PDFs (facturas, contratos, presupuestos)
- Dar sugerencias sobre organización del trabajo
- Responder preguntas sobre el sistema

Sé conciso, profesional y útil. Responde en español.`;

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: parseInt(
        this.configService.get('OPENAI_MAX_TOKENS') || '4000',
      ),
      temperature: 0.7,
    });

    return completion.choices[0].message.content || 'No pude generar una respuesta.';
  }

  /**
   * Sugerencias para completar campos de formularios
   */
  async suggestFieldValues(
    documentType: string,
    existingData: Record<string, any>,
  ): Promise<Record<string, any>> {
    const prompt = `Dado un documento de tipo "${documentType}" con estos datos parciales:
${JSON.stringify(existingData, null, 2)}

Sugiere valores inteligentes para campos faltantes o mejora los existentes.
Responde SOLO con un JSON válido con las sugerencias.`;

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  /**
   * Análisis de documento PDF generado
   */
  async analyzeDocument(documentData: Record<string, any>): Promise<string> {
    const prompt = `Analiza este documento y proporciona insights útiles:
${JSON.stringify(documentData, null, 2)}

Proporciona:
- Resumen breve
- Puntos importantes
- Recomendaciones o alertas
- Totales y cálculos relevantes`;

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return completion.choices[0].message.content || 'No se pudo analizar el documento.';
  }

  /**
   * Generar descripción para proyecto basado en nombre
   */
  async generateProjectDescription(projectName: string): Promise<string> {
    const prompt = `Genera una descripción profesional breve (2-3 líneas) para un proyecto llamado: "${projectName}"`;

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0].message.content || '';
  }

  /**
   * Sugerencias de tareas para un proyecto
   */
  async suggestTasks(
    projectName: string,
    projectDescription?: string,
  ): Promise<string[]> {
    const prompt = `Para un proyecto "${projectName}"${projectDescription ? ` con descripción: ${projectDescription}` : ''}, sugiere 5-8 tareas específicas.
Responde SOLO con un JSON array de strings.`;

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content || '{"tasks":[]}';
    const parsed = JSON.parse(content);
    return parsed.tasks || [];
  }

  /**
   * Resumen de múltiples items
   */
  async summarizeItems(
    itemType: string,
    items: any[],
  ): Promise<string> {
    const prompt = `Resume estos ${itemType}:
${JSON.stringify(items, null, 2)}

Proporciona un resumen ejecutivo breve destacando:
- Cantidad total
- Estadísticas clave
- Patrones o tendencias
- Recomendaciones`;

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.5,
    });

    return completion.choices[0].message.content || 'No se pudo generar el resumen.';
  }

  /**
   * Detectar idioma y traducir si es necesario
   */
  async detectAndTranslate(text: string, targetLang: string = 'es'): Promise<string> {
    const prompt = `Detecta el idioma del texto y tradúcelo a ${targetLang === 'es' ? 'español' : 'inglés'}:
"${text}"

Responde SOLO con la traducción, sin explicaciones.`;

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL') || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });

    return completion.choices[0].message.content || text;
  }
}
