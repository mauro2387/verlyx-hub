# Módulo de IA - Verlyx Hub

## Visión General

El módulo de IA integra **OpenAI GPT-4/GPT-5.1** para proveer un asistente inteligente capaz de:

- Responder preguntas sobre el negocio
- Generar propuestas y documentos
- Analizar datos y métricas
- Sugerir acciones y seguimientos
- Resumir información

## Arquitectura

```
┌─────────────────┐
│  Flutter App    │
│  AI Chat UI     │
└────────┬────────┘
         │ HTTP POST /ai/chat
         │
┌────────▼────────────────────────┐
│  NestJS Backend                 │
│  AI Service                     │
│  ┌──────────────────────────┐  │
│  │ Context Builder          │  │
│  │ - Fetch relevant data    │  │
│  │ - Build structured prompt│  │
│  └──────────┬───────────────┘  │
│             │                   │
│  ┌──────────▼───────────────┐  │
│  │ OpenAI Service           │  │
│  │ - Call GPT API           │  │
│  │ - Process response       │  │
│  └──────────┬───────────────┘  │
│             │                   │
│  ┌──────────▼───────────────┐  │
│  │ Save to DB               │  │
│  │ - ai_conversations       │  │
│  │ - ai_messages            │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
         │
         │ HTTPS
         │
┌────────▼─────────┐
│  OpenAI API      │
│  GPT-4 Turbo     │
└──────────────────┘
```

## Backend Implementation

### AI Service

```typescript
// ai/ai.service.ts
@Injectable()
export class AiService {
  constructor(
    private openaiService: OpenAIService,
    private contextBuilder: ContextBuilderService,
    @InjectRepository(AiConversation)
    private conversationsRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private messagesRepo: Repository<AiMessage>,
  ) {}

  async chat(userId: string, dto: ChatDto): Promise<ChatResponse> {
    // 1. Obtener o crear conversación
    let conversation = dto.conversationId
      ? await this.conversationsRepo.findOne(dto.conversationId)
      : await this.conversationsRepo.save({
          userId,
          contextType: dto.contextType,
          contextId: dto.contextId,
        });

    // 2. Guardar mensaje del usuario
    await this.messagesRepo.save({
      conversationId: conversation.id,
      role: 'user',
      content: dto.message,
    });

    // 3. Construir contexto
    const context = await this.contextBuilder.buildContext({
      userId,
      contextType: dto.contextType,
      contextId: dto.contextId,
      conversationHistory: await this.getConversationHistory(conversation.id),
    });

    // 4. Llamar a OpenAI
    const aiResponse = await this.openaiService.chat({
      systemPrompt: this.buildSystemPrompt(context),
      messages: context.conversationHistory,
      userMessage: dto.message,
    });

    // 5. Guardar respuesta de IA
    const aiMessage = await this.messagesRepo.save({
      conversationId: conversation.id,
      role: 'assistant',
      content: aiResponse.content,
      tokensUsed: aiResponse.tokensUsed,
      model: aiResponse.model,
    });

    return {
      conversationId: conversation.id,
      message: aiMessage.content,
      tokensUsed: aiMessage.tokensUsed,
    };
  }

  async generateProposal(userId: string, dto: GenerateProposalDto) {
    // Obtener datos del cliente y proyecto
    const context = await this.contextBuilder.buildProposalContext({
      clientId: dto.clientId,
      projectType: dto.projectType,
      requirements: dto.requirements,
    });

    const prompt = `
Genera una propuesta profesional de ${dto.projectType} para ${context.client.name}.

Requisitos del cliente:
${dto.requirements}

Información del cliente:
- Empresa: ${context.client.company}
- Industria: ${context.client.industry}
- Proyectos previos: ${context.previousProjects.map(p => p.name).join(', ')}

La propuesta debe incluir:
1. Resumen ejecutivo
2. Alcance del proyecto
3. Metodología
4. Cronograma estimado
5. Presupuesto
6. Términos y condiciones

Formato: Markdown profesional.
`;

    const response = await this.openaiService.generate({
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Guardar conversación
    await this.saveAiInteraction(userId, 'proposal', dto.clientId, prompt, response);

    return {
      proposal: response.content,
      tokensUsed: response.tokensUsed,
    };
  }

  async summarize(userId: string, dto: SummarizeDto) {
    const prompt = `
Resumir el siguiente contenido de forma concisa:

${dto.content}

Puntos clave a incluir:
- Ideas principales
- Acciones sugeridas
- Conclusiones
`;

    const response = await this.openaiService.generate({
      prompt,
      temperature: 0.5,
      maxTokens: 500,
    });

    return {
      summary: response.content,
      tokensUsed: response.tokensUsed,
    };
  }

  private buildSystemPrompt(context: any): string {
    return `
Eres un asistente inteligente para Verlyx Hub, una plataforma de gestión empresarial.

Tu rol es ayudar al usuario con:
- Análisis de datos de negocios
- Generación de propuestas y documentos
- Sugerencias de acciones y seguimientos
- Respuestas sobre clientes, proyectos y métricas

Contexto actual:
- Usuario: ${context.user.fullName} (${context.user.role})
- Negocios: PulsarMoon (agencia), Verlyx Buildings, Verlyx Tourism
- Fecha: ${new Date().toLocaleDateString()}

${context.additionalContext || ''}

Instrucciones:
- Responde en español
- Sé conciso y profesional
- Proporciona datos específicos cuando sea posible
- Sugiere acciones concretas
- Si no tienes información, indícalo claramente
`;
  }
}
```

### OpenAI Service

```typescript
// ai/services/openai.service.ts
@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.configService.get('OPENAI_MODEL') || 'gpt-4-turbo',
        messages: [
          { role: 'system', content: params.systemPrompt },
          ...params.messages,
          { role: 'user', content: params.userMessage },
        ],
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 1000,
      });

      return {
        content: response.choices[0].message.content,
        tokensUsed: response.usage.total_tokens,
        model: response.model,
      };
    } catch (error) {
      throw new BadRequestException(`OpenAI error: ${error.message}`);
    }
  }

  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const response = await this.openai.chat.completions.create({
      model: this.configService.get('OPENAI_MODEL'),
      messages: [{ role: 'user', content: params.prompt }],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1500,
    });

    return {
      content: response.choices[0].message.content,
      tokensUsed: response.usage.total_tokens,
      model: response.model,
    };
  }
}
```

### Context Builder Service

```typescript
// ai/services/context-builder.service.ts
@Injectable()
export class ContextBuilderService {
  constructor(
    @InjectRepository(Contact) private contactsRepo: Repository<Contact>,
    @InjectRepository(Project) private projectsRepo: Repository<Project>,
    @InjectRepository(Payment) private paymentsRepo: Repository<Payment>,
  ) {}

  async buildContext(params: BuildContextParams): Promise<AiContext> {
    const context: AiContext = {
      user: params.user,
      conversationHistory: params.conversationHistory || [],
    };

    // Agregar contexto específico según el tipo
    switch (params.contextType) {
      case 'contact':
        context.additionalContext = await this.buildContactContext(params.contextId);
        break;
      case 'project':
        context.additionalContext = await this.buildProjectContext(params.contextId);
        break;
      case 'general':
        context.additionalContext = await this.buildGeneralContext(params.userId);
        break;
    }

    return context;
  }

  private async buildContactContext(contactId: string): Promise<string> {
    const contact = await this.contactsRepo.findOne(contactId, {
      relations: ['company', 'deals', 'payments'],
    });

    return `
Contexto del contacto:
- Nombre: ${contact.firstName} ${contact.lastName}
- Email: ${contact.email}
- Empresa: ${contact.company?.name}
- Tipo: ${contact.type}
- Estado: ${contact.status}
- Deals: ${contact.deals.length}
- Pagos totales: $${contact.payments.reduce((sum, p) => sum + p.amount, 0)}
- Última interacción: ${contact.lastContactedAt}
`;
  }

  private async buildProjectContext(projectId: string): Promise<string> {
    const project = await this.projectsRepo.findOne(projectId, {
      relations: ['client', 'tasks', 'documents'],
    });

    return `
Contexto del proyecto:
- Nombre: ${project.name}
- Cliente: ${project.client.firstName} ${project.client.lastName}
- Estado: ${project.status}
- Progreso: ${project.progressPercentage}%
- Presupuesto: $${project.budgetAmount}
- Tareas: ${project.tasks.length} (${project.tasks.filter(t => t.status === 'done').length} completadas)
- Inicio: ${project.startDate}
- Vencimiento: ${project.dueDate}
`;
  }

  private async buildGeneralContext(userId: string): Promise<string> {
    // Obtener métricas generales
    const [totalClients, activeProjects, monthlyRevenue] = await Promise.all([
      this.contactsRepo.count({ where: { type: 'client' } }),
      this.projectsRepo.count({ where: { status: 'active' } }),
      this.paymentsRepo
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.createdAt >= :startOfMonth', {
          startOfMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        })
        .andWhere('payment.status = :status', { status: 'completed' })
        .getRawOne(),
    ]);

    return `
Métricas generales del negocio:
- Total de clientes: ${totalClients}
- Proyectos activos: ${activeProjects}
- Ingresos del mes: $${monthlyRevenue.total || 0}
`;
  }
}
```

## Frontend Implementation

### AI Chat Screen

```dart
// ai_assistant/presentation/screens/ai_chat_screen.dart
class AiChatScreen extends ConsumerStatefulWidget {
  final String? conversationId;
  final String? contextType;
  final String? contextId;

  const AiChatScreen({
    Key? key,
    this.conversationId,
    this.contextType,
    this.contextId,
  }) : super(key: key);

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  
  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(aiChatProvider(widget.conversationId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asistente IA'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => _clearConversation(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: chatState.messages.length,
              itemBuilder: (context, index) {
                final message = chatState.messages[index];
                return ChatBubble(
                  message: message,
                  isUser: message.role == 'user',
                );
              },
            ),
          ),
          
          // Loading indicator
          if (chatState.isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),
          
          // Input Field
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(
                      hintText: 'Escribe tu mensaje...',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: _sendMessage,
                  style: IconButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    ref.read(aiChatProvider(widget.conversationId).notifier).sendMessage(
          _messageController.text.trim(),
          contextType: widget.contextType,
          contextId: widget.contextId,
        );

    _messageController.clear();
    
    // Scroll to bottom
    Future.delayed(const Duration(milliseconds: 100), () {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  void _clearConversation() {
    ref.read(aiChatProvider(widget.conversationId).notifier).clearConversation();
  }
}
```

### Quick Actions

```dart
// Botones de acción rápida en pantalla de cliente
Row(
  children: [
    ElevatedButton.icon(
      icon: Icon(Icons.description),
      label: Text('Generar Propuesta'),
      onPressed: () async {
        final proposal = await ref
            .read(aiServiceProvider)
            .generateProposal(
              clientId: contact.id,
              projectType: 'Desarrollo Web',
              requirements: 'Sitio corporativo con CMS',
            );
        
        // Mostrar propuesta
        showDialog(
          context: context,
          builder: (context) => ProposalDialog(proposal: proposal),
        );
      },
    ),
    SizedBox(width: 8),
    OutlinedButton.icon(
      icon: Icon(Icons.chat),
      label: Text('Hablar con IA'),
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => AiChatScreen(
              contextType: 'contact',
              contextId: contact.id,
            ),
          ),
        );
      },
    ),
  ],
)
```

## Casos de Uso

### 1. Generar Propuesta

**Usuario**: "Genera una propuesta para desarrollo web para el cliente XYZ"

**IA**: Crea propuesta detallada con:
- Resumen ejecutivo
- Alcance
- Metodología
- Cronograma
- Presupuesto sugerido

### 2. Análisis de Cliente

**Usuario**: "¿Cuál es el estado del cliente ABC?"

**IA**: Responde con:
- Información de contacto
- Historial de proyectos
- Pagos realizados
- Próximos seguimientos
- Recomendaciones

### 3. Sugerencias de Tareas

**Usuario**: "¿Qué tareas debería hacer hoy?"

**IA**: Analiza y sugiere:
- Tareas vencidas
- Clientes sin seguimiento
- Pagos pendientes
- Proyectos que necesitan atención

### 4. Resumen de Reunión

**Usuario**: "Resume esta reunión: [notas de la reunión]"

**IA**: Extrae:
- Puntos clave
- Decisiones tomadas
- Tareas asignadas
- Próximos pasos

## Optimizaciones

### Caché de Contexto

```typescript
@Injectable()
export class ContextCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getOrBuildContext(key: string, builder: () => Promise<string>) {
    const cached = await this.cacheManager.get<string>(key);
    if (cached) return cached;

    const context = await builder();
    await this.cacheManager.set(key, context, 300); // 5 min TTL
    return context;
  }
}
```

### Rate Limiting

```typescript
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  @Post('chat')
  @Throttle(10, 60) // 10 requests per minute
  async chat(@CurrentUser() user, @Body() dto: ChatDto) {
    return this.aiService.chat(user.sub, dto);
  }

  @Post('generate-proposal')
  @Throttle(5, 60) // 5 requests per minute (más costoso)
  async generateProposal(@CurrentUser() user, @Body() dto: GenerateProposalDto) {
    return this.aiService.generateProposal(user.sub, dto);
  }
}
```

## Monitoreo

- Logs de todas las interacciones con IA
- Métricas de tokens consumidos
- Costos estimados
- Tiempo de respuesta
- Errores y reintentos

## Referencias

- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [Best Practices for Prompts](https://platform.openai.com/docs/guides/prompt-engineering)
