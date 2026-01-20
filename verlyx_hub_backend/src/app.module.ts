import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AiModule } from './modules/ai/ai.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskCommentsModule } from './modules/task-comments/task-comments.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { PdfGeneratorModule } from './modules/pdf-generator/pdf-generator.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { CompanyModule } from './modules/company/company.module';
import { MyCompaniesModule } from './modules/my-companies/my-companies.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DealsModule } from './modules/deals/deals.module';
import { CompanyContextMiddleware } from './common/middleware/company-context.middleware';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    
    // Custom modules
    SupabaseModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    PaymentsModule,
    AiModule,
    TasksModule,
    TaskCommentsModule,
    DocumentsModule,
    WorkspaceModule,
    PdfGeneratorModule,
    NotificationsModule,
    CompanyModule,
    MyCompaniesModule,
    OrganizationsModule,
    DealsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar CompanyContextMiddleware a todas las rutas excepto auth
    consumer
      .apply(CompanyContextMiddleware)
      .exclude('auth/(.*)')
      .forRoutes('*');
  }
}
