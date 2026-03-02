// ============================================================
// AI ROUTER — Centralized OpenAI Service
// Verlyx Hub Enterprise Architecture
// ============================================================
// Dynamically routes AI tasks to the optimal OpenAI model
// with retry logic, timeout handling, and cost tracking.
// ============================================================

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ==========================================
// TYPES
// ==========================================

export type AITaskType =
  | 'classify'
  | 'generate_email'
  | 'generate_whatsapp'
  | 'interpret_tags'
  | 'score_lead'
  | 'summarize'
  | 'extract'
  | 'chat'
  | 'analyze';

export type AIModelTier = 'fast' | 'balanced' | 'powerful';

export interface AIModelConfig {
  modelName: string;
  provider: 'openai';
  tier: AIModelTier;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export interface AIRouteConfig {
  modelName: string;
  maxRetries: number;
  timeoutMs: number;
  priority: number;
}

export interface AIRequestOptions {
  taskType: AITaskType;
  messages: ChatCompletionMessageParam[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
  userId?: string;
  companyId?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCostUsd: number;
  latencyMs: number;
  retryCount: number;
  toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}

export interface AIStreamOptions extends AIRequestOptions {
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall) => void;
}

// ==========================================
// DEFAULT MODEL REGISTRY
// ==========================================

const MODEL_REGISTRY: Record<string, AIModelConfig> = {
  'gpt-4.1-mini': {
    modelName: 'gpt-4.1-mini',
    provider: 'openai',
    tier: 'fast',
    maxTokens: 16384,
    costPer1kInput: 0.0004,
    costPer1kOutput: 0.0016,
  },
  'gpt-4o-mini': {
    modelName: 'gpt-4o-mini',
    provider: 'openai',
    tier: 'fast',
    maxTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  'gpt-4.1': {
    modelName: 'gpt-4.1',
    provider: 'openai',
    tier: 'powerful',
    maxTokens: 32768,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.008,
  },
  'gpt-4o': {
    modelName: 'gpt-4o',
    provider: 'openai',
    tier: 'balanced',
    maxTokens: 16384,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
};

// ==========================================
// DEFAULT ROUTING TABLE
// ==========================================

const DEFAULT_ROUTES: Record<AITaskType, AIRouteConfig[]> = {
  classify: [
    { modelName: 'gpt-4.1-mini', maxRetries: 2, timeoutMs: 10000, priority: 1 },
    { modelName: 'gpt-4o-mini', maxRetries: 1, timeoutMs: 15000, priority: 2 },
  ],
  interpret_tags: [
    { modelName: 'gpt-4.1-mini', maxRetries: 2, timeoutMs: 10000, priority: 1 },
    { modelName: 'gpt-4o-mini', maxRetries: 1, timeoutMs: 15000, priority: 2 },
  ],
  score_lead: [
    { modelName: 'gpt-4.1-mini', maxRetries: 2, timeoutMs: 10000, priority: 1 },
    { modelName: 'gpt-4o-mini', maxRetries: 1, timeoutMs: 15000, priority: 2 },
  ],
  generate_email: [
    { modelName: 'gpt-4.1', maxRetries: 2, timeoutMs: 30000, priority: 1 },
    { modelName: 'gpt-4o', maxRetries: 1, timeoutMs: 30000, priority: 2 },
  ],
  generate_whatsapp: [
    { modelName: 'gpt-4.1', maxRetries: 2, timeoutMs: 20000, priority: 1 },
    { modelName: 'gpt-4o', maxRetries: 1, timeoutMs: 20000, priority: 2 },
  ],
  summarize: [
    { modelName: 'gpt-4.1', maxRetries: 2, timeoutMs: 30000, priority: 1 },
    { modelName: 'gpt-4o', maxRetries: 1, timeoutMs: 30000, priority: 2 },
  ],
  extract: [
    { modelName: 'gpt-4.1', maxRetries: 2, timeoutMs: 20000, priority: 1 },
    { modelName: 'gpt-4o', maxRetries: 1, timeoutMs: 20000, priority: 2 },
  ],
  chat: [
    { modelName: 'gpt-4.1', maxRetries: 2, timeoutMs: 60000, priority: 1 },
    { modelName: 'gpt-4o', maxRetries: 1, timeoutMs: 60000, priority: 2 },
  ],
  analyze: [
    { modelName: 'gpt-4.1', maxRetries: 2, timeoutMs: 60000, priority: 1 },
    { modelName: 'gpt-4o', maxRetries: 1, timeoutMs: 60000, priority: 2 },
  ],
};

// ==========================================
// AI ROUTER CLASS
// ==========================================

class AIRouter {
  private client: OpenAI;
  private routes: Record<AITaskType, AIRouteConfig[]>;
  private models: Record<string, AIModelConfig>;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.client = new OpenAI({ apiKey });
    this.routes = { ...DEFAULT_ROUTES };
    this.models = { ...MODEL_REGISTRY };
  }

  /**
   * Get the optimal model route for a task type.
   * Returns routes sorted by priority (primary first, then fallback).
   */
  getRoutes(taskType: AITaskType): AIRouteConfig[] {
    return this.routes[taskType] || this.routes.chat;
  }

  /**
   * Get model config by name
   */
  getModelConfig(modelName: string): AIModelConfig | undefined {
    return this.models[modelName];
  }

  /**
   * Calculate estimated cost for a request
   */
  calculateCost(modelName: string, promptTokens: number, completionTokens: number): number {
    const model = this.models[modelName];
    if (!model) return 0;
    return (promptTokens * model.costPer1kInput / 1000) + (completionTokens * model.costPer1kOutput / 1000);
  }

  /**
   * Execute an AI request with automatic routing, retry, and fallback.
   */
  async execute(options: AIRequestOptions): Promise<AIResponse> {
    const routes = this.getRoutes(options.taskType);
    let lastError: Error | null = null;
    let totalRetries = 0;

    for (const route of routes) {
      const modelConfig = this.models[route.modelName];
      if (!modelConfig) continue;

      for (let attempt = 0; attempt <= route.maxRetries; attempt++) {
        try {
          const startTime = Date.now();

          const messages: ChatCompletionMessageParam[] = [];
          if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
          }
          messages.push(...options.messages);

          const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: route.modelName,
            messages,
            max_tokens: options.maxTokens || modelConfig.maxTokens,
            temperature: options.temperature ?? 0.7,
          };

          if (options.jsonMode) {
            requestParams.response_format = { type: 'json_object' };
          }

          if (options.tools && options.tools.length > 0) {
            requestParams.tools = options.tools;
            if (options.toolChoice) {
              requestParams.tool_choice = options.toolChoice;
            }
          }

          // Create timeout abort controller
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), route.timeoutMs);

          const completion = await this.client.chat.completions.create(requestParams, {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const latencyMs = Date.now() - startTime;
          const choice = completion.choices[0];
          const usage = completion.usage;

          const promptTokens = usage?.prompt_tokens || 0;
          const completionTokens = usage?.completion_tokens || 0;

          return {
            content: choice.message.content || '',
            model: route.modelName,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            },
            estimatedCostUsd: this.calculateCost(route.modelName, promptTokens, completionTokens),
            latencyMs,
            retryCount: totalRetries,
            toolCalls: choice.message.tool_calls,
          };
        } catch (error: unknown) {
          totalRetries++;
          lastError = error instanceof Error ? error : new Error(String(error));

          // Don't retry on client errors (4xx) except rate limits (429)
          if (error instanceof OpenAI.APIError) {
            if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
              throw error;
            }
          }

          // Exponential backoff between retries
          if (attempt < route.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
          }
        }
      }
    }

    throw lastError || new Error(`All AI routes failed for task: ${options.taskType}`);
  }

  /**
   * Execute a streaming AI request with automatic routing.
   * Used for the chat interface.
   */
  async *stream(options: AIStreamOptions): AsyncGenerator<string, AIResponse> {
    const routes = this.getRoutes(options.taskType);
    const route = routes[0]; // Use primary route for streaming

    if (!route) {
      throw new Error(`No route configured for task: ${options.taskType}`);
    }

    const modelConfig = this.models[route.modelName];
    if (!modelConfig) {
      throw new Error(`Model not found: ${route.modelName}`);
    }

    const startTime = Date.now();
    const messages: ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push(...options.messages);

    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: route.modelName,
      messages,
      max_tokens: options.maxTokens || modelConfig.maxTokens,
      temperature: options.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (options.tools && options.tools.length > 0) {
      requestParams.tools = options.tools;
      if (options.toolChoice) {
        requestParams.tool_choice = options.toolChoice;
      }
    }

    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;
    const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];

    const stream = await this.client.chat.completions.create(requestParams);

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (delta?.content) {
        content += delta.content;
        yield delta.content;
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id) {
            toolCalls.push({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              },
            });
          } else if (toolCalls.length > 0 && tc.function?.arguments) {
            // Append to the last tool call's arguments
            toolCalls[toolCalls.length - 1].function.arguments += tc.function.arguments;
          }
        }
      }

      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }
    }

    return {
      content,
      model: route.modelName,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      estimatedCostUsd: this.calculateCost(route.modelName, promptTokens, completionTokens),
      latencyMs: Date.now() - startTime,
      retryCount: 0,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * Convenience: Quick classification (returns JSON)
   */
  async classify<T = Record<string, unknown>>(prompt: string, systemPrompt?: string): Promise<T> {
    const response = await this.execute({
      taskType: 'classify',
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: systemPrompt || 'Classify the input. Return a JSON object with your classification.',
      jsonMode: true,
      temperature: 0.1,
    });
    return JSON.parse(response.content) as T;
  }

  /**
   * Convenience: Interpret natural language tags → OSM tags
   */
  async interpretTags(query: string): Promise<{ tags: Record<string, string>; overpassQuery: string }> {
    const response = await this.execute({
      taskType: 'interpret_tags',
      messages: [{ role: 'user', content: query }],
      systemPrompt: `You are an OpenStreetMap tag interpreter. Given a natural language search query about businesses or places, return a JSON object with:
1. "tags": an object mapping OSM tag keys to values (e.g. {"amenity": "restaurant", "cuisine": "italian"})
2. "overpassQuery": a valid Overpass QL query string that would find matching elements within a bounding box [bbox]

Only return valid OSM tags. Be precise. Return JSON only.`,
      jsonMode: true,
      temperature: 0.1,
    });
    return JSON.parse(response.content);
  }

  /**
   * Convenience: Score a lead (0-100)
   */
  async scoreLead(leadData: Record<string, unknown>): Promise<{ score: number; reasoning: string; suggestions: string[] }> {
    const response = await this.execute({
      taskType: 'score_lead',
      messages: [{ role: 'user', content: JSON.stringify(leadData) }],
      systemPrompt: `You are a lead scoring AI. Analyze the provided lead data and return a JSON object with:
1. "score": integer 0-100 representing lead quality/potential
2. "reasoning": brief explanation of the score (in Spanish)
3. "suggestions": array of 1-3 action suggestions to improve conversion (in Spanish)

Scoring criteria:
- Contact info completeness (phone, email, website): +20
- Business type relevance: +25
- Location proximity to service area: +15
- Response history (if any): +20
- Business size indicators: +20

Return JSON only.`,
      jsonMode: true,
      temperature: 0.2,
    });
    return JSON.parse(response.content);
  }

  /**
   * Convenience: Generate outreach email
   */
  async generateEmail(context: {
    leadName: string;
    businessType: string;
    companyName: string;
    tone?: string;
    language?: string;
  }): Promise<{ subject: string; body: string }> {
    const response = await this.execute({
      taskType: 'generate_email',
      messages: [{
        role: 'user',
        content: `Generate a professional outreach email for:
Lead: ${context.leadName}
Business type: ${context.businessType}
My company: ${context.companyName}
Tone: ${context.tone || 'professional, friendly'}
Language: ${context.language || 'Spanish'}`,
      }],
      systemPrompt: `You are an expert B2B outreach email writer. Generate personalized, non-spammy outreach emails.
Return JSON with "subject" and "body" fields. Write in ${context.language || 'Spanish'}.
Keep it concise (max 150 words), professional, and with a clear call to action.`,
      jsonMode: true,
      temperature: 0.7,
    });
    return JSON.parse(response.content);
  }

  /**
   * Convenience: Generate WhatsApp message
   */
  async generateWhatsApp(context: {
    leadName: string;
    businessType: string;
    companyName: string;
    language?: string;
  }): Promise<{ message: string; waLink: string }> {
    const response = await this.execute({
      taskType: 'generate_whatsapp',
      messages: [{
        role: 'user',
        content: `Generate a WhatsApp outreach message for:
Lead: ${context.leadName}
Business type: ${context.businessType}
My company: ${context.companyName}
Language: ${context.language || 'Spanish'}`,
      }],
      systemPrompt: `You are a WhatsApp business messaging expert. Generate short, personalized outreach messages.
Return JSON with:
- "message": the message text (max 100 words, casual-professional, with emoji)
- "waLink": empty string (will be constructed by the app)
Write in ${context.language || 'Spanish'}. Don't include phone numbers.`,
      jsonMode: true,
      temperature: 0.7,
    });
    return JSON.parse(response.content);
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

let routerInstance: AIRouter | null = null;

export function getAIRouter(): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter();
  }
  return routerInstance;
}

export { AIRouter };
