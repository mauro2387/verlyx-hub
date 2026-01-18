import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PdfGeneratorService } from './pdf-generator.service';
import { CreatePdfTemplateDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';
import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { FilterPdfTemplatesDto } from './dto/filter-pdf-templates.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@Controller('pdf')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PdfGeneratorController {
  constructor(private readonly pdfGeneratorService: PdfGeneratorService) {}

  // PDF Templates endpoints
  @Post('templates')
  createTemplate(@Body() createDto: CreatePdfTemplateDto) {
    return this.pdfGeneratorService.createTemplate(createDto);
  }

  @Get('templates')
  findAllTemplates(@Query() filters: FilterPdfTemplatesDto) {
    return this.pdfGeneratorService.findAllTemplates(filters);
  }

  @Get('templates/:id')
  findOneTemplate(@Param('id') id: string) {
    return this.pdfGeneratorService.findOneTemplate(id);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() updateDto: UpdatePdfTemplateDto) {
    return this.pdfGeneratorService.updateTemplate(id, updateDto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id') id: string) {
    return this.pdfGeneratorService.removeTemplate(id);
  }

  // PDF Generation endpoints
  @Post('generate')
  generatePdf(@Body() generateDto: GeneratePdfDto) {
    return this.pdfGeneratorService.generatePdf(generateDto);
  }

  @Get('generated')
  findAllGeneratedPdfs(@Query('template_id') templateId?: string) {
    return this.pdfGeneratorService.findAllGeneratedPdfs(templateId);
  }

  @Get('generated/:id')
  findOneGeneratedPdf(@Param('id') id: string) {
    return this.pdfGeneratorService.findOneGeneratedPdf(id);
  }

  @Delete('generated/:id')
  removeGeneratedPdf(@Param('id') id: string) {
    return this.pdfGeneratorService.removeGeneratedPdf(id);
  }
}
