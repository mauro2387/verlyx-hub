// ============================================================
// OUTREACH CAMPAIGN API ROUTE
// Verlyx Hub Enterprise Architecture
// ============================================================
// POST /api/outreach/send
// Generates and sends outreach messages to leads based on
// their opportunity type. Uses existing ai-router.ts for
// content generation and /api/email/send for delivery.
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
    const { action = 'generate', leadIds, campaignId, companyName, channel = 'email' } = body;

    // ── Generate outreach content for a single lead ──
    if (action === 'generate') {
      const { leadId } = body;
      if (!leadId) {
        return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .select('id, company_name, business_type, opportunity_type, digital_score, contact_email, contact_phone, website')
        .eq('id', leadId)
        .single();

      if (error || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const router = getAIRouter();
      const myCompany = companyName || 'Nuestra empresa';

      if (channel === 'email') {
        const emailContent = await router.generateEmail({
          leadName: lead.company_name,
          businessType: lead.business_type || 'negocio',
          companyName: myCompany,
          tone: getOutreachTone(lead.opportunity_type),
        });

        return NextResponse.json({
          channel: 'email',
          content: emailContent,
          lead: { id: lead.id, name: lead.company_name, email: lead.contact_email },
        });
      }

      if (channel === 'whatsapp') {
        const waContent = await router.generateWhatsApp({
          leadName: lead.company_name,
          businessType: lead.business_type || 'negocio',
          companyName: myCompany,
        });

        // Build WhatsApp link if phone available
        let waLink = '';
        if (lead.contact_phone) {
          const cleanPhone = lead.contact_phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
          waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waContent.message)}`;
        }

        return NextResponse.json({
          channel: 'whatsapp',
          content: { ...waContent, waLink },
          lead: { id: lead.id, name: lead.company_name, phone: lead.contact_phone },
        });
      }

      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    // ── Bulk generate for a list of leads ──
    if (action === 'bulk-generate' && Array.isArray(leadIds)) {
      const maxBulk = 10;
      const limited = leadIds.slice(0, maxBulk);

      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, company_name, business_type, opportunity_type, digital_score, contact_email, contact_phone')
        .in('id', limited);

      if (error || !leads) {
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
      }

      const router = getAIRouter();
      const myCompany = companyName || 'Nuestra empresa';

      const results = await Promise.all(
        leads.map(async (lead) => {
          try {
            if (channel === 'email' && lead.contact_email) {
              const content = await router.generateEmail({
                leadName: lead.company_name,
                businessType: lead.business_type || 'negocio',
                companyName: myCompany,
                tone: getOutreachTone(lead.opportunity_type),
              });
              return { leadId: lead.id, leadName: lead.company_name, channel: 'email', content, success: true };
            }
            if (channel === 'whatsapp' && lead.contact_phone) {
              const content = await router.generateWhatsApp({
                leadName: lead.company_name,
                businessType: lead.business_type || 'negocio',
                companyName: myCompany,
              });
              return { leadId: lead.id, leadName: lead.company_name, channel: 'whatsapp', content, success: true };
            }
            return { leadId: lead.id, leadName: lead.company_name, channel, success: false, reason: `No ${channel} contact info` };
          } catch (err: unknown) {
            return { leadId: lead.id, leadName: lead.company_name, channel, success: false, reason: err instanceof Error ? err.message : 'Unknown error' };
          }
        })
      );

      // Update campaign stats if campaignId provided
      if (campaignId) {
        const successCount = results.filter(r => r.success).length;
        await supabase
          .from('prospecting_campaigns')
          .update({
            contacted_leads: successCount,
            status: 'active',
          })
          .eq('id', campaignId);
      }

      return NextResponse.json({
        results,
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        truncated: leadIds.length > maxBulk,
      });
    }

    // ── Send email via existing email route ──
    if (action === 'send-email') {
      const { leadId, subject, emailBody, from } = body;

      const { data: lead } = await supabase
        .from('leads')
        .select('id, company_name, contact_email')
        .eq('id', leadId)
        .single();

      if (!lead?.contact_email) {
        return NextResponse.json({ error: 'Lead has no email' }, { status: 400 });
      }

      // Forward to existing email API
      const emailRes = await fetch(new URL('/api/email/send', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ email: lead.contact_email, name: lead.company_name }],
          subject,
          body: emailBody,
          from,
        }),
      });

      const emailResult = await emailRes.json();

      // Log activity
      if (emailRes.ok) {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          activity_type: 'email',
          channel: 'email',
          subject,
          body: emailBody,
          outcome: 'sent',
        });

        // Update lead status
        await supabase
          .from('leads')
          .update({
            status: 'contacted',
            last_contact_date: new Date().toISOString(),
          })
          .eq('id', leadId);
      }

      return NextResponse.json({ success: emailRes.ok, ...emailResult });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Outreach API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==========================================
// HELPERS
// ==========================================

function getOutreachTone(opportunityType: string | null): string {
  switch (opportunityType) {
    case 'NO_WEBSITE':
      return 'consultivo, empático — el lead no tiene web y probablemente no está consciente de lo que pierde';
    case 'BROKEN_WEBSITE':
      return 'urgente pero amable — el sitio del lead está roto y probablemente no lo sabe';
    case 'SLOW_WEBSITE':
      return 'técnico pero accesible — el sitio del lead es lento y afecta su negocio';
    case 'BAD_SEO':
      return 'educativo — el lead tiene web pero no aparece en Google, mostrar valor del SEO';
    case 'LOW_DIGITAL_PRESENCE':
      return 'motivacional — el lead tiene potencial digital sin explotar';
    default:
      return 'professional, friendly';
  }
}
