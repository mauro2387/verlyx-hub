'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Input, Select, Textarea, Modal, EmptyState, Loading } from '@/components/ui';
import { usePdfGeneratorStore, PdfTemplate, GeneratedPdf } from '@/lib/store';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const templateTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  contract: { label: 'Contrato', color: 'bg-indigo-100 text-indigo-700', icon: '📄' },
  invoice: { label: 'Factura', color: 'bg-green-100 text-green-700', icon: '🧾' },
  receipt: { label: 'Recibo', color: 'bg-orange-100 text-orange-700', icon: '🧾' },
  quote: { label: 'Cotización', color: 'bg-blue-100 text-blue-700', icon: '💰' },
  report: { label: 'Reporte', color: 'bg-purple-100 text-purple-700', icon: '📊' },
};

// HTML Templates for each document type
const generateHtmlContent = (template: PdfTemplate, data: Record<string, string>, logoUrl: string | null): string => {
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const logoHtml = logoUrl 
    ? `<img src="${logoUrl}" alt="Logo" style="max-height: 80px; max-width: 200px; object-fit: contain;" />`
    : `<div style="width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px;">V</div>`;

  switch (template.templateType) {
    case 'contract':
      return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 3px solid #6366f1; padding-bottom: 20px;">
            ${logoHtml}
            <div style="text-align: right;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px;">CONTRATO DE SERVICIOS</h1>
              <p style="margin: 5px 0 0; color: #6b7280;">${today}</p>
            </div>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px; color: #374151; font-size: 18px;">Partes del Contrato</h2>
            <p style="margin: 0 0 10px;"><strong>Proveedor:</strong> ${data.providerName || 'N/A'}</p>
            <p style="margin: 0;"><strong>Cliente:</strong> ${data.clientName || 'N/A'}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #6366f1; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Descripción del Servicio</h3>
            <p style="line-height: 1.6; color: #4b5563;">${data.serviceDescription || 'N/A'}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Fecha de Inicio</p>
              <p style="margin: 5px 0 0; font-weight: 600; color: #1f2937;">${data.startDate || 'N/A'}</p>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Fecha de Fin</p>
              <p style="margin: 5px 0 0; font-weight: 600; color: #1f2937;">${data.endDate || 'N/A'}</p>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Valor Total del Contrato</p>
            <p style="margin: 5px 0 0; font-size: 32px; font-weight: bold;">$${Number(data.value || 0).toLocaleString('es-ES')}</p>
          </div>
          
          ${data.terms ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #6366f1; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Términos y Condiciones</h3>
            <p style="line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.terms}</p>
          </div>
          ` : ''}
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; padding-top: 40px; border-top: 2px solid #e5e7eb;">
            <div style="text-align: center;">
              <div style="border-bottom: 2px solid #1f2937; margin-bottom: 10px; height: 50px;"></div>
              <p style="margin: 0; color: #6b7280;">Firma del Proveedor</p>
              <p style="margin: 5px 0 0; font-weight: 600;">${data.providerName || ''}</p>
            </div>
            <div style="text-align: center;">
              <div style="border-bottom: 2px solid #1f2937; margin-bottom: 10px; height: 50px;"></div>
              <p style="margin: 0; color: #6b7280;">Firma del Cliente</p>
              <p style="margin: 5px 0 0; font-weight: 600;">${data.clientName || ''}</p>
            </div>
          </div>
        </div>
      `;

    case 'invoice':
      return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
            ${logoHtml}
            <div style="text-align: right;">
              <h1 style="margin: 0; color: #059669; font-size: 32px; font-weight: 800;">FACTURA</h1>
              <p style="margin: 10px 0 5px; color: #1f2937; font-size: 18px;">#${data.invoiceNumber || '0001'}</p>
              <p style="margin: 0; color: #6b7280;">Fecha: ${today}</p>
            </div>
          </div>
          
          <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 20px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 10px; color: #065f46;">Facturar a:</h3>
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${data.clientName || 'N/A'}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #374151; margin-bottom: 15px;">Conceptos</h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
              ${data.items || 'N/A'}
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #6b7280;">Subtotal:</span>
              <span style="font-weight: 600;">$${Number(data.subtotal || 0).toLocaleString('es-ES')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #6b7280;">Impuestos (${data.tax || 0}%):</span>
              <span style="font-weight: 600;">$${(Number(data.subtotal || 0) * Number(data.tax || 0) / 100).toLocaleString('es-ES')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #e5e7eb;">
              <span style="font-size: 20px; font-weight: 700; color: #059669;">TOTAL:</span>
              <span style="font-size: 24px; font-weight: 800; color: #059669;">$${Number(data.total || 0).toLocaleString('es-ES')}</span>
            </div>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px;">
            <p style="margin: 0; color: #92400e;"><strong>Fecha de vencimiento:</strong> ${data.dueDate || 'N/A'}</p>
          </div>
        </div>
      `;

    case 'quote':
      return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px;">
            ${logoHtml}
            <div style="text-align: right;">
              <h1 style="margin: 0; color: #1e40af; font-size: 28px;">COTIZACIÓN</h1>
              <p style="margin: 10px 0 5px; font-size: 16px; color: #1f2937;">#${data.quoteNumber || '0001'}</p>
              <p style="margin: 0; color: #6b7280;">${today}</p>
            </div>
          </div>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Preparado para:</p>
            <p style="margin: 5px 0 0; font-size: 20px; font-weight: 600; color: #1e3a8a;">${data.clientName || 'N/A'}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #3b82f6; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Descripción del Proyecto</h3>
            <p style="line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.projectDescription || 'N/A'}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #3b82f6; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Entregables</h3>
            <p style="line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.deliverables || 'N/A'}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Tiempo de Entrega</p>
              <p style="margin: 10px 0 0; font-size: 24px; font-weight: 700; color: #1e40af;">${data.timeline || 'N/A'}</p>
            </div>
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 20px; border-radius: 8px; text-align: center; color: white;">
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Inversión Total</p>
              <p style="margin: 10px 0 0; font-size: 28px; font-weight: 800;">$${Number(data.price || 0).toLocaleString('es-ES')}</p>
            </div>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px;">
            <p style="margin: 0; color: #92400e;"><strong>⏰ Esta cotización es válida hasta:</strong> ${data.validUntil || 'N/A'}</p>
          </div>
        </div>
      `;

    case 'receipt':
      return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; background: white;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #f97316;">
            ${logoHtml}
            <h1 style="margin: 20px 0 0; color: #ea580c; font-size: 32px;">RECIBO DE PAGO</h1>
            <p style="margin: 10px 0 0; color: #6b7280;">Nº ${data.receiptNumber || '0001'}</p>
          </div>
          
          <div style="background: #fff7ed; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #9a3412;">Recibido de:</span>
              <span style="font-weight: 600; color: #1f2937;">${data.clientName || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #9a3412;">Concepto:</span>
              <span style="font-weight: 600; color: #1f2937;">${data.concept || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #9a3412;">Método de Pago:</span>
              <span style="font-weight: 600; color: #1f2937;">${data.paymentMethod || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #9a3412;">Fecha de Pago:</span>
              <span style="font-weight: 600; color: #1f2937;">${data.paymentDate || 'N/A'}</span>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Monto Recibido</p>
            <p style="margin: 10px 0 0; font-size: 40px; font-weight: 800;">$${Number(data.amount || 0).toLocaleString('es-ES')}</p>
          </div>
          
          <div style="text-align: center; margin-top: 50px; padding-top: 30px; border-top: 2px dashed #e5e7eb;">
            <div style="border-bottom: 2px solid #1f2937; width: 200px; margin: 0 auto 10px;"></div>
            <p style="margin: 0; color: #6b7280;">Firma Autorizada</p>
            <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">${today}</p>
          </div>
        </div>
      `;

    case 'report':
      return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 30px; border-radius: 12px; color: white;">
            <div>
              <h1 style="margin: 0; font-size: 28px;">${data.reportTitle || 'Reporte'}</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Período: ${data.period || 'N/A'}</p>
            </div>
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain; background: white; padding: 8px; border-radius: 8px;" />` : ''}
          </div>
          
          <div style="background: #faf5ff; border-left: 4px solid #7c3aed; padding: 20px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 10px; color: #6b21a8;">📋 Resumen Ejecutivo</h3>
            <p style="margin: 0; line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.summary || 'N/A'}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #7c3aed; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">✅ Logros</h3>
            <p style="line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.achievements || 'N/A'}</p>
          </div>
          
          ${data.challenges ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #7c3aed; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">⚠️ Desafíos</h3>
            <p style="line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.challenges}</p>
          </div>
          ` : ''}
          
          ${data.nextSteps ? `
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px;">
            <h3 style="margin: 0 0 10px; color: #166534;">🚀 Próximos Pasos</h3>
            <p style="margin: 0; line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.nextSteps}</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Generado el ${today}</p>
          </div>
        </div>
      `;

    default:
      return `<div style="padding: 40px; text-align: center;">Plantilla no disponible</div>`;
  }
};

export default function PdfGeneratorPage() {
  const { 
    templates, 
    generatedPdfs, 
    isLoading,
    fetchTemplates,
    fetchGeneratedPdfs,
    deleteGeneratedPdf,
  } = usePdfGeneratorStore();

  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'templates' | 'generated'>('templates');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PdfTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
    fetchGeneratedPdfs();
  }, [fetchTemplates, fetchGeneratedPdfs]);

  // Update preview when form data or logo changes
  useEffect(() => {
    if (selectedTemplate) {
      const html = generateHtmlContent(selectedTemplate, formData, logoUrl);
      setPreviewHtml(html);
    }
  }, [selectedTemplate, formData, logoUrl]);

  const filteredTemplates = filterType === 'all' 
    ? templates 
    : templates.filter(t => t.templateType === filterType);

  const handleOpenGenerateModal = (template: PdfTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setLogoUrl(null);
    setShowPreview(false);
    setGeneratedPdfBlob(null);
    setIsGenerateModalOpen(true);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setLogoUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePreview = () => {
    setShowPreview(true);
  };

  const handleGeneratePdf = async () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    
    try {
      // Create an isolated iframe to avoid Tailwind CSS v4 color issues
      // Use higher resolution for better quality
      const scaleFactor = 3;
      const baseWidth = 800;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = `${baseWidth}px`;
      iframe.style.height = '1400px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');
      
      // Write clean HTML without Tailwind - with high-res fonts
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                background: white; 
                font-family: 'Segoe UI', Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>${previewHtml}</body>
        </html>
      `);
      iframeDoc.close();
      
      // Wait for content to render and images to load
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Generate high-resolution canvas from iframe body
      const canvas = await html2canvas(iframeDoc.body, {
        scale: scaleFactor,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: baseWidth,
        windowWidth: baseWidth,
        logging: false,
      } as any);
      
      document.body.removeChild(iframe);
      
      // Create PDF with high quality image
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false,
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Generate blob for preview/download
      const pdfBlob = pdf.output('blob');
      const fileName = `${selectedTemplate.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      
      setGeneratedPdfBlob(pdfBlob);
      setGeneratedPdfName(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedPdfBlob) return;
    
    const url = URL.createObjectURL(generatedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generatedPdfName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Close modal after download
    setIsGenerateModalOpen(false);
    setShowPreview(false);
    setGeneratedPdfBlob(null);
  };

  const handleDelete = async (pdfId: string) => {
    if (confirm('¿Estás seguro de eliminar este PDF?')) {
      await deleteGeneratedPdf(pdfId);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Generador de PDFs"
        description="Crea contratos, facturas, cotizaciones y más con vista previa en tiempo real"
        actions={
          <div className="flex gap-2">
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los tipos' },
                { value: 'contract', label: 'Contratos' },
                { value: 'invoice', label: 'Facturas' },
                { value: 'receipt', label: 'Recibos' },
                { value: 'quote', label: 'Cotizaciones' },
                { value: 'report', label: 'Reportes' },
              ]}
            />
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              📄 Plantillas ({templates.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('generated')}
            className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'generated'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              📁 PDFs Generados ({generatedPdfs.length})
            </span>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'templates' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No hay plantillas"
                description="Las plantillas se cargarán automáticamente"
                icon={<span className="text-6xl">📄</span>}
              />
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const config = templateTypeConfig[template.templateType] || { label: 'Otro', color: 'bg-gray-100 text-gray-700', icon: '📄' };
              return (
                <Card key={template.id} hoverable className="group">
                  <CardContent>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{config.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{template.fields.length} campos</span>
                      <span>{template.fields.filter(f => f.required).length} requeridos</span>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => handleOpenGenerateModal(template)}
                    >
                      <span className="mr-2">✨</span>
                      Generar PDF
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <div>
          {generatedPdfs.length === 0 ? (
            <EmptyState
              title="No hay PDFs generados"
              description="Genera tu primer documento desde las plantillas"
              icon={<span className="text-6xl">📁</span>}
              action={<Button onClick={() => setActiveTab('templates')}>Ver Plantillas</Button>}
            />
          ) : (
            <div className="space-y-4">
              {generatedPdfs.map((pdf) => (
                <Card key={pdf.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">
                          📕
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{pdf.fileName}</h3>
                          <p className="text-sm text-gray-500">
                            {pdf.templateName} • {new Date(pdf.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(pdf.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Modal with Preview */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          setShowPreview(false);
          setGeneratedPdfBlob(null);
        }}
        title={`Generar: ${selectedTemplate?.name}`}
        size="xl"
      >
        {selectedTemplate && (
          <div className="flex flex-col lg:flex-row gap-6 max-h-[80vh]">
            {/* Form Section */}
            <div className="lg:w-1/2 overflow-y-auto pr-2">
              <div className="space-y-4">
                {/* Logo Drop Zone */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo de la Empresa (opcional)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : logoUrl 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                    }`}
                  >
                    {logoUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={logoUrl} alt="Logo" className="max-h-20 max-w-40 object-contain" />
                        <p className="text-sm text-green-600">✓ Logo cargado</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLogoUrl(null); }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Eliminar logo
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">🖼️</span>
                        <p className="text-sm text-gray-600">
                          Arrastra tu logo aquí o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, SVG</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Form Fields */}
                {selectedTemplate.fields.map((field) => (
                  <div key={field.name}>
                    {field.type === 'textarea' ? (
                      <Textarea
                        label={field.label}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                        required={field.required}
                        rows={3}
                      />
                    ) : field.type === 'select' && field.options ? (
                      <Select
                        label={field.label}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                        options={field.options.map(o => ({ value: o, label: o }))}
                        placeholder={`Seleccionar ${field.label.toLowerCase()}`}
                      />
                    ) : (
                      <Input
                        label={field.label}
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Section */}
            <div className="lg:w-1/2 border-l border-gray-200 pl-6">
              <div className="sticky top-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Vista Previa</h3>
                  {!showPreview && (
                    <Button size="sm" variant="outline" onClick={handleGeneratePreview}>
                      👁️ Ver Previa
                    </Button>
                  )}
                </div>
                
                {showPreview ? (
                  <div className="space-y-4">
                    {/* Preview Container */}
                    <div 
                      ref={previewRef}
                      className="bg-white border rounded-lg shadow-inner overflow-auto max-h-[400px]"
                      style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166.67%' }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      {!generatedPdfBlob ? (
                        <Button 
                          className="flex-1" 
                          onClick={handleGeneratePdf}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Generando...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">📄</span>
                              Generar PDF
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700" 
                            onClick={handleDownloadPdf}
                          >
                            <span className="mr-2">⬇️</span>
                            Descargar PDF
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setGeneratedPdfBlob(null);
                            }}
                          >
                            🔄 Regenerar
                          </Button>
                        </>
                      )}
                    </div>

                    {generatedPdfBlob && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="text-green-700 font-medium">✅ PDF generado correctamente</p>
                        <p className="text-sm text-green-600 mt-1">
                          {generatedPdfName} ({(generatedPdfBlob.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <span className="text-6xl mb-4 block">📄</span>
                    <p className="text-gray-500">
                      Completa los campos y haz clic en &quot;Ver Previa&quot; para ver cómo quedará tu documento
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
