import { Module } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfGeneratorController } from './pdf-generator.controller';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [PdfGeneratorController],
  providers: [PdfGeneratorService],
  exports: [PdfGeneratorService],
})
export class PdfGeneratorModule {}
