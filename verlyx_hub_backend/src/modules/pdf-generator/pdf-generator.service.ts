import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreatePdfTemplateDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';
import { GeneratePdfDto } from './dto/generate-pdf.dto';
import { FilterPdfTemplatesDto } from './dto/filter-pdf-templates.dto';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class PdfGeneratorService {
  constructor(private readonly supabase: SupabaseService) {}

  async createTemplate(createDto: CreatePdfTemplateDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from('pdf_templates')
      .insert([createDto])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAllTemplates(filters?: FilterPdfTemplatesDto) {
    let query = this.supabase.getClient().from('pdf_templates').select('*');

    if (filters?.template_type) {
      query = query.eq('template_type', filters.template_type);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOneTemplate(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateTemplate(id: string, updateDto: UpdatePdfTemplateDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from('pdf_templates')
      .update(updateDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeTemplate(id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('pdf_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Template deleted successfully' };
  }

  async generatePdf(generateDto: GeneratePdfDto) {
    // Verify template exists
    const template = await this.findOneTemplate(generateDto.template_id);
    if (!template) {
      throw new Error('Template not found');
    }

    try {
      // 1. Prepare data with calculations
      const processedData = this.processDocumentData(
        generateDto.document_data,
        template.template_type,
      );

      // 2. Load HTML template
      // Usar ruta absoluta desde el directorio raíz del proyecto
      const projectRoot = path.join(__dirname, '..', '..', '..');
      const templatePath = path.join(
        projectRoot,
        'src',
        'modules',
        'pdf-generator',
        'templates',
        `${template.template_type}.html`,
      );
      const htmlTemplate = await fs.readFile(templatePath, 'utf-8');

      // 3. Compile with Handlebars
      const compiledTemplate = Handlebars.compile(htmlTemplate);
      const html = compiledTemplate({
        ...processedData,
        generation_date: new Date().toLocaleDateString('es-ES'),
      });

      // 4. Generate PDF with Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      
      await browser.close();

      // 5. Upload to Supabase Storage
      const fileName = `${template.template_type}_${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await this.supabase
        .getClient()
        .storage
        .from('generated-pdfs')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload PDF to storage');
      }

      // 6. Get public URL
      const { data: urlData } = this.supabase
        .getClient()
        .storage
        .from('generated-pdfs')
        .getPublicUrl(fileName);

      const file_path = urlData.publicUrl;

      // 7. Save record to database
      const pdfRecord = {
        template_id: generateDto.template_id,
        file_name: generateDto.file_name || fileName,
        file_path,
        document_data: processedData,
        related_contact_id: generateDto.related_contact_id,
        related_project_id: generateDto.related_project_id,
      };

      const { data, error } = await this.supabase
        .getClient()
        .from('generated_pdfs')
        .insert([pdfRecord])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  private processDocumentData(data: any, templateType: string): any {
    const processed = { ...data };

    // Process items list with calculations
    if (processed.items && Array.isArray(processed.items)) {
      processed.items = processed.items.map((item: any) => ({
        ...item,
        total: (item.quantity || 0) * (item.price || 0),
      }));

      // Calculate subtotal
      processed.subtotal = processed.items.reduce(
        (sum: number, item: any) => sum + (item.total || 0),
        0,
      );
    }

    // Calculate tax and total for invoice/quote
    if (['invoice', 'quote'].includes(templateType)) {
      const subtotal = processed.subtotal || 0;
      const taxRate = processed.tax || 0;
      const discountRate = processed.discount || 0;

      // Calculate discount amount
      if (discountRate > 0) {
        processed.discount_amount = (subtotal * discountRate) / 100;
      }

      const subtotalAfterDiscount = subtotal - (processed.discount_amount || 0);

      // Calculate tax amount
      processed.tax_amount = (subtotalAfterDiscount * taxRate) / 100;

      // Calculate total
      processed.total = subtotalAfterDiscount + processed.tax_amount;
    }

    // Format numbers to 2 decimals
    if (processed.subtotal) processed.subtotal = processed.subtotal.toFixed(2);
    if (processed.tax_amount) processed.tax_amount = processed.tax_amount.toFixed(2);
    if (processed.discount_amount) processed.discount_amount = processed.discount_amount.toFixed(2);
    if (processed.total) processed.total = processed.total.toFixed(2);
    if (processed.amount) processed.amount = processed.amount.toFixed(2);
    if (processed.payment_amount) processed.payment_amount = processed.payment_amount.toFixed(2);

    if (processed.items) {
      processed.items = processed.items.map((item: any) => ({
        ...item,
        price: item.price ? parseFloat(item.price).toFixed(2) : '0.00',
        total: item.total ? parseFloat(item.total).toFixed(2) : '0.00',
      }));
    }

    return processed;
  }

  async findAllGeneratedPdfs(templateId?: string) {
    let query = this.supabase.getClient().from('generated_pdfs').select('*');

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOneGeneratedPdf(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('generated_pdfs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async removeGeneratedPdf(id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('generated_pdfs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Generated PDF deleted successfully' };
  }
}
