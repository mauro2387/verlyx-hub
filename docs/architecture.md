# Arquitectura del Sistema Verlyx Hub

## 1. Visión General

Verlyx Hub es una super-app empresarial construida con arquitectura modular que separa claramente las responsabilidades entre frontend, backend y servicios externos.

### Principios Arquitectónicos

1. **Separación de Responsabilidades**: Clean Architecture en Flutter, arquitectura modular en NestJS
2. **Escalabilidad**: Diseño preparado para crecer en negocios y usuarios
3. **Seguridad First**: JWT, HTTPS, roles, encriptación
4. **Multiplataforma**: Write once, run everywhere (Android/iOS/Windows/Web)
5. **Modularidad**: Cada feature es independiente y puede evolucionar

## 2. Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTES                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Android  │  │   iOS    │  │ Windows  │  │   Web    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └─────────────┴──────────────┴─────────────┘          │
│                  Flutter Application                        │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS/REST
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  API GATEWAY / BACKEND                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NestJS Application                     │   │
│  │                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│   │
│  │  │   Auth   │ │   CRM    │ │ Projects │ │  AI    ││   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘│   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ Payments │ │   Tasks  │ │Documents │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────┬───────────────────────────┘
            │                     │
            │                     │
┌───────────▼────────┐  ┌─────────▼──────────────────────────┐
│    SUPABASE        │  │   SERVICIOS EXTERNOS               │
│                    │  │                                     │
│  ┌──────────────┐  │  │  ┌─────────────┐ ┌──────────────┐ │
│  │ PostgreSQL   │  │  │  │  OpenAI     │ │ MercadoPago  │ │
│  └──────────────┘  │  │  │  GPT-5.1    │ │   Payments   │ │
│  ┌──────────────┐  │  │  └─────────────┘ └──────────────┘ │
│  │     Auth     │  │  │  ┌─────────────┐ ┌──────────────┐ │
│  └──────────────┘  │  │  │  Firebase   │ │   dLocal     │ │
│  ┌──────────────┐  │  │  │     FCM     │ │  (Future)    │ │
│  │   Storage    │  │  │  └─────────────┘ └──────────────┘ │
│  └──────────────┘  │  └─────────────────────────────────────┘
└────────────────────┘
```

## 3. Arquitectura Frontend (Flutter)

### 3.1 Clean Architecture + MVVM

```
lib/
├── core/                           # Configuración y utilidades base
│   ├── constants/
│   │   ├── api_constants.dart      # URLs, endpoints
│   │   ├── app_constants.dart      # Textos, valores fijos
│   │   └── theme_constants.dart    # Colores, estilos
│   ├── theme/
│   │   ├── app_theme.dart          # Theme principal
│   │   └── responsive_utils.dart   # Helpers responsive
│   ├── network/
│   │   ├── api_client.dart         # HTTP client (Dio)
│   │   ├── api_interceptor.dart    # Auth interceptor
│   │   └── network_info.dart       # Check connectivity
│   ├── utils/
│   │   ├── validators.dart
│   │   ├── formatters.dart
│   │   └── date_utils.dart
│   └── error/
│       ├── failures.dart
│       └── exceptions.dart
│
├── features/                       # Módulos por funcionalidad
│   ├── auth/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   │   ├── auth_remote_datasource.dart
│   │   │   │   └── auth_local_datasource.dart
│   │   │   ├── models/
│   │   │   │   ├── user_model.dart
│   │   │   │   └── login_request_model.dart
│   │   │   └── repositories/
│   │   │       └── auth_repository_impl.dart
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user_entity.dart
│   │   │   ├── repositories/
│   │   │   │   └── auth_repository.dart
│   │   │   └── usecases/
│   │   │       ├── login_usecase.dart
│   │   │       ├── logout_usecase.dart
│   │   │       └── get_current_user_usecase.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── auth_provider.dart  # Riverpod
│   │       ├── screens/
│   │       │   ├── login_screen.dart
│   │       │   └── splash_screen.dart
│   │       └── widgets/
│   │           ├── login_form.dart
│   │           └── auth_button.dart
│   │
│   ├── dashboard/                  # Home/Dashboard
│   ├── crm/                        # CRM Module
│   ├── pulsarmoon/                 # PulsarMoon Projects
│   ├── verlyx/                     # Verlyx Ecosystem
│   ├── payments/                   # Payment Links & Subscriptions
│   ├── ai_assistant/               # AI Chat & Actions
│   ├── tasks/                      # Tasks & Agenda
│   └── documents/                  # Document Management
│
└── main.dart                       # App entry point
```

### 3.2 Flujo de Datos (MVVM + Riverpod)

```
┌──────────────┐
│    Screen    │  ← Usuario interactúa
│  (View)      │
└──────┬───────┘
       │ Observa state
       │
┌──────▼───────┐
│   Provider   │  ← Riverpod StateNotifier
│ (ViewModel)  │
└──────┬───────┘
       │ Llama
       │
┌──────▼───────┐
│   UseCase    │  ← Lógica de negocio
│  (Domain)    │
└──────┬───────┘
       │ Usa
       │
┌──────▼───────┐
│  Repository  │  ← Abstracción de datos
│  (Domain)    │
└──────┬───────┘
       │ Implementado por
       │
┌──────▼───────┐
│ Repository   │
│     Impl     │  ← Lógica de acceso a datos
│   (Data)     │
└──────┬───────┘
       │ Usa
       │
┌──────▼───────┐
│ DataSource   │  ← API / Local Storage
│   (Data)     │
└──────────────┘
```

### 3.3 State Management con Riverpod

**Ejemplo: Auth Provider**

```dart
// Estado
class AuthState {
  final UserEntity? user;
  final bool isLoading;
  final String? error;
  
  const AuthState({this.user, this.isLoading = false, this.error});
}

// Provider
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(loginUseCaseProvider));
});

// Notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final LoginUseCase _loginUseCase;
  
  AuthNotifier(this._loginUseCase) : super(const AuthState());
  
  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true);
    
    final result = await _loginUseCase(LoginParams(email, password));
    
    result.fold(
      (failure) => state = state.copyWith(error: failure.message, isLoading: false),
      (user) => state = state.copyWith(user: user, isLoading: false),
    );
  }
}
```

### 3.4 Navegación con go_router

```dart
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoggedIn = authState.user != null;
      final isLoginRoute = state.location == '/login';
      
      if (!isLoggedIn && !isLoginRoute) return '/login';
      if (isLoggedIn && isLoginRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => LoginScreen()),
      GoRoute(
        path: '/',
        builder: (context, state) => DashboardScreen(),
        routes: [
          GoRoute(path: 'crm', builder: (context, state) => CrmScreen()),
          GoRoute(path: 'projects', builder: (context, state) => ProjectsScreen()),
          // ...más rutas
        ],
      ),
    ],
  );
});
```

## 4. Arquitectura Backend (NestJS)

### 4.1 Estructura Modular

```
src/
├── common/                         # Compartido entre módulos
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── dto/
│       ├── pagination.dto.ts
│       └── response.dto.ts
│
├── config/                         # Configuración
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── openai.config.ts
│   └── mercadopago.config.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── refresh-token.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │
│   ├── crm/
│   │   ├── crm.module.ts
│   │   ├── contacts/
│   │   │   ├── contacts.controller.ts
│   │   │   ├── contacts.service.ts
│   │   │   └── entities/contact.entity.ts
│   │   ├── companies/
│   │   └── deals/
│   │
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   ├── tasks/
│   │   └── entities/
│   │
│   ├── payments/
│   │   ├── payments.module.ts
│   │   ├── payment-links/
│   │   ├── subscriptions/
│   │   ├── webhooks/
│   │   │   └── mercadopago-webhook.controller.ts
│   │   └── services/
│   │       └── mercadopago.service.ts
│   │
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── ai.controller.ts
│   │   ├── ai.service.ts
│   │   ├── services/
│   │   │   ├── openai.service.ts
│   │   │   └── context-builder.service.ts
│   │   └── dto/
│   │
│   ├── tasks/
│   ├── documents/
│   └── notifications/
│
└── main.ts                         # Bootstrap application
```

### 4.2 Patrón de Módulo NestJS

**Ejemplo: Projects Module**

```typescript
// projects.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Task]),
    UsersModule,
    DocumentsModule,
  ],
  controllers: [ProjectsController, TasksController],
  providers: [ProjectsService, TasksService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

// projects.controller.ts
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.projectsService.findAll(paginationDto);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }
}

// projects.service.ts
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private supabaseService: SupabaseService,
  ) {}

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponse<Project>> {
    const { page, limit } = paginationDto;
    
    const [data, total] = await this.projectsRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
```

### 4.3 Integración con Supabase

```typescript
// supabase.service.ts
@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL'),
      this.configService.get('SUPABASE_SERVICE_KEY'),
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Auth helpers
  async verifyToken(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error) throw new UnauthorizedException(error.message);
    return data;
  }

  // Storage helpers
  async uploadFile(bucket: string, path: string, file: Buffer) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file);
    
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
```

## 5. Base de Datos (PostgreSQL via Supabase)

### 5.1 Esquema Relacional

Ver [database-schema.md](./database-schema.md) para el esquema completo SQL.

**Principales relaciones:**

```
profiles (1) ──< (N) contacts
profiles (1) ──< (N) projects
contacts (1) ──< (N) deals
contacts (1) ──< (N) payments
projects (1) ──< (N) tasks
projects (1) ──< (N) documents
subscriptions (1) ──< (N) payments
ai_conversations (1) ──< (N) ai_messages
```

### 5.2 Row Level Security (RLS)

```sql
-- Ejemplo: Solo el owner y admins pueden ver contactos
CREATE POLICY "Users can view contacts"
  ON contacts FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('owner', 'admin')
    )
  );

-- Solo owner puede modificar suscripciones
CREATE POLICY "Only owner can modify subscriptions"
  ON subscriptions FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'owner'
    )
  );
```

## 6. Seguridad

### 6.1 Autenticación y Autorización

**Flow de Auth:**

```
1. Usuario hace login → POST /auth/login { email, password }
2. Backend verifica con Supabase Auth
3. Si válido, genera:
   - Access Token (JWT, expira en 15min)
   - Refresh Token (expira en 7 días)
4. Cliente guarda tokens en secure storage
5. Cada request incluye: Authorization: Bearer <access_token>
6. Si access token expira → POST /auth/refresh con refresh token
```

**JWT Payload:**

```json
{
  "sub": "user-uuid",
  "email": "owner@verlyx.com",
  "role": "owner",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### 6.2 Seguridad en Pagos

- **NUNCA** almacenar números de tarjeta
- Usar tokens de pago de MercadoPago
- Webhooks verificados con firma HMAC
- Secrets en variables de entorno
- HTTPS obligatorio

### 6.3 Rate Limiting

```typescript
// main.ts
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de requests
    message: 'Too many requests from this IP',
  })
);

// Endpoints críticos con rate limit personalizado
@Throttle(5, 60) // 5 requests por minuto
@Post('ai/generate-proposal')
async generateProposal() { ... }
```

## 7. Integraciones Externas

### 7.1 OpenAI (IA)

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

  async generateCompletion(prompt: string, context: any): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'Eres un asistente de negocios experto.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content;
  }
}
```

### 7.2 MercadoPago

```typescript
// payments/services/mercadopago.service.ts
@Injectable()
export class MercadoPagoService {
  private mp: MercadoPagoConfig;

  constructor(private configService: ConfigService) {
    this.mp = new MercadoPagoConfig({
      accessToken: this.configService.get('MERCADOPAGO_ACCESS_TOKEN'),
    });
  }

  async createPaymentLink(data: CreatePaymentLinkDto): Promise<PaymentLink> {
    const preference = new Preference(this.mp);
    
    const response = await preference.create({
      items: [
        {
          title: data.description,
          quantity: 1,
          unit_price: data.amount,
        },
      ],
      back_urls: {
        success: `${this.configService.get('APP_URL')}/payments/success`,
        failure: `${this.configService.get('APP_URL')}/payments/failure`,
      },
      notification_url: `${this.configService.get('API_URL')}/webhooks/mercadopago`,
    });

    return {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    };
  }

  async createSubscription(data: CreateSubscriptionDto): Promise<Subscription> {
    // Implementar con Preapproval API de MercadoPago
  }
}
```

### 7.3 Firebase Cloud Messaging

```typescript
// notifications/services/fcm.service.ts
@Injectable()
export class FCMService {
  private admin: admin.app.App;

  constructor() {
    this.admin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      }),
    });
  }

  async sendNotification(token: string, notification: NotificationPayload) {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      token,
    };

    return this.admin.messaging().send(message);
  }
}
```

## 8. CI/CD Pipeline

### 8.1 GitHub Actions - Backend

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'verlyx_hub_backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd verlyx_hub_backend && npm ci
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          cd verlyx_hub_backend
          docker build -t verlyx-hub-backend:${{ github.sha }} .
```

### 8.2 GitHub Actions - Flutter

```yaml
# .github/workflows/flutter-ci.yml
name: Flutter CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'verlyx_hub_flutter/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
      - run: cd verlyx_hub_flutter && flutter pub get
      - run: flutter test
      - run: flutter analyze

  build-android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'
      - run: cd verlyx_hub_flutter && flutter build apk --release
```

## 9. Monitoreo y Observabilidad

### 9.1 Logging

```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(`${method} ${url} - ${responseTime}ms`);
      }),
    );
  }
}
```

### 9.2 Error Tracking (Futuro: Sentry)

```typescript
// main.ts
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
}
```

## 10. Escalabilidad

### 10.1 Estrategias de Caching

```typescript
// Cache en memoria con Redis (futuro)
@Injectable()
export class DashboardService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getDashboardMetrics(userId: string) {
    const cacheKey = `dashboard:${userId}`;
    
    // Intentar obtener del cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Si no existe, calcular
    const metrics = await this.calculateMetrics(userId);
    
    // Guardar en cache por 5 minutos
    await this.cacheManager.set(cacheKey, metrics, 300);
    
    return metrics;
  }
}
```

### 10.2 Paginación

```typescript
// dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Respuesta paginada
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}
```

## 11. Testing Strategy

### 11.1 Backend Tests

```typescript
// projects/projects.service.spec.ts
describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: Repository<Project>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should create a project', async () => {
    const dto = { name: 'Test Project', businessUnit: 'pulsarmoon' };
    const expected = { id: '1', ...dto };

    jest.spyOn(repository, 'save').mockResolvedValue(expected as any);

    const result = await service.create(dto);
    expect(result).toEqual(expected);
  });
});
```

### 11.2 Flutter Tests

```dart
// test/features/auth/presentation/providers/auth_provider_test.dart
void main() {
  late MockLoginUseCase mockLoginUseCase;
  late AuthNotifier authNotifier;

  setUp(() {
    mockLoginUseCase = MockLoginUseCase();
    authNotifier = AuthNotifier(mockLoginUseCase);
  });

  group('AuthNotifier', () {
    test('should emit loading then user on successful login', () async {
      // Arrange
      final user = UserEntity(id: '1', email: 'test@test.com');
      when(() => mockLoginUseCase(any()))
          .thenAnswer((_) async => Right(user));

      // Act
      final future = authNotifier.stream.take(2).toList();
      authNotifier.login('test@test.com', 'password');

      // Assert
      expect(
        await future,
        [
          AuthState(isLoading: true),
          AuthState(user: user, isLoading: false),
        ],
      );
    });
  });
}
```

## 12. Consideraciones de Performance

### 12.1 Lazy Loading en Flutter

```dart
// Usar go_router con lazy loading
GoRoute(
  path: '/projects',
  builder: (context, state) => const ProjectsScreen(),
  routes: [
    GoRoute(
      path: ':id',
      builder: (context, state) {
        // Cargar datos solo cuando se accede
        return ProjectDetailScreen(id: state.params['id']!);
      },
    ),
  ],
),
```

### 12.2 Optimización de Queries

```typescript
// Usar select para traer solo los campos necesarios
async findAllLight(): Promise<ProjectLight[]> {
  return this.projectsRepository
    .createQueryBuilder('project')
    .select(['project.id', 'project.name', 'project.status'])
    .getMany();
}

// Eager loading con relations
async findOneWithDetails(id: string): Promise<Project> {
  return this.projectsRepository.findOne({
    where: { id },
    relations: ['tasks', 'documents', 'client'],
  });
}
```

---

**Próximos pasos**: Ver [database-schema.md](./database-schema.md) para el esquema completo de la base de datos.
