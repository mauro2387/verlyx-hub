import { Module, Global } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { SupabaseModule } from '../../common/supabase/supabase.module';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [
    CompanyService,
    {
      provide: 'COMPANY_SERVICE',
      useExisting: CompanyService,
    },
  ],
  controllers: [CompanyController],
  exports: [CompanyService, 'COMPANY_SERVICE'],
})
export class CompanyModule {}
