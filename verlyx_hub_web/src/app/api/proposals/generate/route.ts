// ============================================================
// PROPOSAL GENERATOR API ROUTE
// Verlyx Hub Enterprise Architecture
// ============================================================
// POST /api/proposals/generate
// Generates a commercial proposal based on a lead's audit data
// using ai-router.ts (generate_proposal task type).
// ============================================================

import { NextResponse } from 'next/server';
import { getAIRouter } from '@/lib/ai-router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, companyName: overrideCompanyName } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    // Fetch the lead with audit data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, company_name, business_type, opportunity_type, digital_score, audit_data, website, my_company_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get the company name for the proposal
    let myCompanyName = overrideCompanyName || 'Nuestra empresa';
    if (lead.my_company_id) {
      const { data: company } = await supabase
        .from('my_companies')
        .select('name')
        .eq('id', lead.my_company_id)
        .single();
      if (company) myCompanyName = company.name;
    }

    // Extract audit issues
    const auditData = lead.audit_data as Record<string, unknown> || {};
    const detectedIssues = (auditData.detectedIssues as string[]) || [];
    const recommendations = (auditData.recommendations as string[]) || [];

    // If no audit has been run, return error suggesting to audit first
    if (!lead.opportunity_type) {
      return NextResponse.json({
        error: 'Este lead no tiene un audit digital. Ejecuta el audit primero desde la página de prospección.',
        needsAudit: true,
      }, { status: 400 });
    }

    // Generate proposal via AI router
    const router = getAIRouter();
    const proposal = await router.generateProposal({
      leadName: lead.company_name,
      businessType: lead.business_type || 'negocio',
      opportunityType: lead.opportunity_type,
      auditScore: lead.digital_score || 0,
      auditIssues: detectedIssues.length > 0 ? detectedIssues : recommendations,
      companyName: myCompanyName,
    });

    // Build HTML for PDF generation (compatible with enterprise-helpers PDF system)
    const proposalHtml = buildProposalHtml(proposal, {
      leadName: lead.company_name,
      companyName: myCompanyName,
      auditScore: lead.digital_score || 0,
      opportunityType: lead.opportunity_type,
      website: lead.website,
    });

    return NextResponse.json({
      proposal,
      html: proposalHtml,
      lead: {
        id: lead.id,
        name: lead.company_name,
        opportunityType: lead.opportunity_type,
        digitalScore: lead.digital_score,
      },
    });
  } catch (error: unknown) {
    console.error('Proposal generation error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==========================================
// HTML TEMPLATE BUILDER
// ==========================================

function buildProposalHtml(
  proposal: { title: string; summary: string; sections: { heading: string; content: string }[]; callToAction: string },
  context: { leadName: string; companyName: string; auditScore: number; opportunityType: string; website?: string | null }
) {
  const scoreColor = context.auditScore >= 60 ? '#22C55E' : context.auditScore >= 30 ? '#F97316' : '#EF4444';
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
    .header h1 { color: #1e40af; font-size: 28px; margin-bottom: 8px; }
    .header p { color: #6b7280; font-size: 14px; margin: 4px 0; }
    .score-badge { display: inline-block; background: ${scoreColor}; color: white; padding: 8px 20px; border-radius: 20px; font-size: 18px; font-weight: bold; margin: 10px 0; }
    .summary { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .section { margin: 24px 0; }
    .section h2 { color: #1e40af; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .section p { color: #374151; white-space: pre-wrap; }
    .cta { background: #1e40af; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 32px; }
    .cta p { color: white; font-size: 16px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .meta-item { text-align: center; }
    .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .meta-value { font-size: 16px; font-weight: bold; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${proposal.title}</h1>
    <p>Preparada para: <strong>${context.leadName}</strong></p>
    <p>Por: <strong>${context.companyName}</strong> — ${date}</p>
    <div class="score-badge">Score Digital: ${context.auditScore}/100</div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <div class="meta-label">Diagnóstico</div>
      <div class="meta-value">${context.opportunityType.replace(/_/g, ' ')}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Sitio web</div>
      <div class="meta-value">${context.website || 'Sin sitio web'}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Score</div>
      <div class="meta-value" style="color: ${scoreColor}">${context.auditScore}/100</div>
    </div>
  </div>

  <div class="summary">
    <p>${proposal.summary}</p>
  </div>

  ${proposal.sections.map(s => `
  <div class="section">
    <h2>${s.heading}</h2>
    <p>${s.content}</p>
  </div>
  `).join('')}

  <div class="cta">
    <p>${proposal.callToAction}</p>
  </div>

  <div class="footer">
    <p>Propuesta generada por ${context.companyName} — ${date}</p>
    <p>Powered by Verlyx Hub</p>
  </div>
</body>
</html>`.trim();
}
