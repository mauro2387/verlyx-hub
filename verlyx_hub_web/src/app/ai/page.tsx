'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, Avatar } from '@/components/ui';
import { useAuthStore } from '@/lib/store';

// ==========================================
// HELPERS
// ==========================================

/** Extract all text content from a v6 UIMessage */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/** Extract tool parts from a v6 UIMessage */
function getToolParts(message: UIMessage) {
  return message.parts.filter(
    (p) => p.type === 'dynamic-tool' || p.type.startsWith('tool-')
  );
}

// ==========================================
// PAGE
// ==========================================

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [input, setInput] = useState('');

  const initialMessages: UIMessage[] = [
    {
      id: 'welcome',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: '¡Hola! Soy el asistente operativo de Verlyx Hub. Tengo acceso en tiempo real a tus datos de negocio: deals, proyectos, tareas, finanzas y más.\n\nPuedo:\n• **Analizar** tu pipeline, finanzas y proyectos\n• **Ejecutar acciones** como crear tareas, mover deals o marcar pagos\n• **Dar recomendaciones** basadas en tus datos reales\n\n¿En qué puedo ayudarte?',
        },
      ],
    },
  ];

  const { messages, sendMessage, status, error: chatError, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      body: { userId: user?.id },
    }),
    messages: initialMessages,
    onFinish: () => {
      setShowSuggestions(false);
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const hasError = status === 'error';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    setShowSuggestions(false);
    sendMessage({ text: input.trim() });
    setInput('');
  };

  const suggestions = [
    '¿Cuál es el estado financiero de este mes?',
    '¿Qué tareas urgentes tengo pendientes?',
    'Dame un resumen del pipeline de ventas',
    '¿Qué facturas están vencidas?',
    'Crea una tarea para revisar propuestas',
    '¿Cómo van mis proyectos activos?',
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Asistente IA"
        description="Tu asistente operativo con acceso a datos en tiempo real"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message) => {
                const textContent = getMessageText(message);
                const toolParts = getToolParts(message);

                return (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar
                      name={message.role === 'user' ? user?.fullName || user?.name || 'Usuario' : 'AI'}
                      color={message.role === 'user' ? '#6366f1' : '#10b981'}
                    />
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-50 text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.role === 'assistant' && textContent ? (
                        <div className="prose prose-sm max-w-none">
                          <AssistantMessage content={textContent} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{textContent}</p>
                      )}

                      {/* Tool invocations */}
                      {toolParts.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {toolParts.map((part, idx) => {
                            const toolName = 'toolName' in part ? (part as { toolName: string }).toolName : part.type.replace('tool-', '');
                            const state = 'state' in part ? (part as { state: string }).state : 'unknown';
                            const isDone = state === 'result' || state === 'output-available';
                            return (
                              <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-1">
                                <span className={isDone ? '' : 'animate-pulse'}>⚡</span>
                                <span>
                                  {isDone
                                    ? `Ejecutado: ${formatToolName(toolName)}`
                                    : `Ejecutando: ${formatToolName(toolName)}...`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-4">
                  <Avatar name="AI" color="#10b981" />
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs text-gray-400 ml-2">Analizando datos...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {hasError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">⚠️ Error al comunicarse con el asistente</p>
                  {chatError ? (
                    <p className="text-xs bg-amber-100 rounded p-2 mt-1 font-mono break-all">
                      {chatError.message || String(chatError)}
                    </p>
                  ) : (
                    <p>Verifica que OPENAI_API_KEY esté configurada en <code className="bg-amber-100 px-1 rounded">.env.local</code></p>
                  )}
                  <p className="mt-1 text-xs text-amber-600">Si el error persiste, verificá que tu API key sea válida en platform.openai.com</p>
                  <button onClick={() => clearError()} className="mt-2 text-xs text-indigo-600 hover:underline">Reintentar</button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {showSuggestions && messages.length <= 1 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">Sugerencias:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Pregunta sobre tu negocio o pide una acción..."
                  className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={1}
                  disabled={isLoading}
                />
                <Button type="button" onClick={handleSend} disabled={!input.trim() || isLoading}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Asistente Verlyx</h3>
                <p className="text-sm text-gray-500">OpenAI GPT-4.1 · Datos en vivo</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Conectado a tus datos en tiempo real via Supabase. Puede consultar y ejecutar acciones sobre tu negocio.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Capacidades</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              {[
                'Resumen financiero en vivo',
                'Análisis de pipeline CRM',
                'Estado de proyectos',
                'Crear tareas y eventos',
                'Mover deals de etapa',
                'Marcar pagos como cobrados',
                'Recomendaciones proactivas',
              ].map((cap, i) => (
                <li key={i} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {cap}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Modelo</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Proveedor</span>
                <span className="font-medium text-gray-900">OpenAI</span>
              </div>
              <div className="flex justify-between">
                <span>Modelo</span>
                <span className="font-medium text-gray-900">GPT-4.1</span>
              </div>
              <div className="flex justify-between">
                <span>Tool Use</span>
                <span className="font-medium text-emerald-600">Activo</span>
              </div>
              <div className="flex justify-between">
                <span>Streaming</span>
                <span className="font-medium text-emerald-600">Activo</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function AssistantMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const boldRegex = /\*\*(.*?)\*\*/g;

  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('• ') || line.startsWith('- ')) {
          const text = line.replace(/^[•\-]\s*/, '');
          return (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span className="text-sm" dangerouslySetInnerHTML={{ __html: text.replace(boldRegex, '<strong>$1</strong>') }} />
            </div>
          );
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.replace('## ', '')}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.replace('# ', '')}</h2>;
        }
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-indigo-500 font-medium min-w-[1.5rem]">{line.match(/^\d+/)?.[0]}.</span>
              <span className="text-sm" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '').replace(boldRegex, '<strong>$1</strong>') }} />
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        return (
          <p key={i} className="text-sm py-0.5" dangerouslySetInnerHTML={{ __html: line.replace(boldRegex, '<strong>$1</strong>') }} />
        );
      })}
    </>
  );
}

function formatToolName(name: string): string {
  const names: Record<string, string> = {
    get_financial_summary: 'Resumen financiero',
    get_pending_items: 'Items pendientes',
    create_task: 'Crear tarea',
    move_deal_stage: 'Mover deal',
    mark_income_received: 'Marcar ingreso cobrado',
    create_calendar_event: 'Crear evento',
    get_project_status: 'Estado del proyecto',
    get_leads_summary: 'Resumen de leads',
    get_opportunities_pipeline: 'Pipeline oportunidades',
  };
  return names[name] || name;
}
