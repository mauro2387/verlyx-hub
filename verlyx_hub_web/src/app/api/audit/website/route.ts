// ============================================================
// AUDIT WEBSITE API ROUTE
// Verlyx Hub Enterprise Architecture
// ============================================================
// POST /api/audit/website
// Runs a digital audit on a URL and returns the result.
// Optionally updates the lead record in Supabase.
// ============================================================

import { NextResponse } from 'next/server';
import { auditWebsite, batchAudit, type DigitalAuditResult } from '@/lib/digital-audit';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = 'audit', url, urls, leadId } = body;

    // ── Single audit ──
    if (action === 'audit') {
      const result = await auditWebsite(url);

      // If leadId provided, update the lead record
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            opportunity_type: result.opportunityType,
            digital_score: result.score,
            last_audit_at: result.auditedAt,
            audit_data: result,
          })
          .eq('id', leadId);
      }

      return NextResponse.json({ result });
    }

    // ── Batch audit ──
    if (action === 'batch' && Array.isArray(urls)) {
      const maxBatch = 20; // limit to prevent timeout
      const limitedUrls = urls.slice(0, maxBatch);
      const results = await batchAudit(limitedUrls, 5);

      return NextResponse.json({
        results,
        total: limitedUrls.length,
        truncated: urls.length > maxBatch,
      });
    }

    // ── Audit and classify a lead (by leadId) ──
    if (action === 'audit-lead' && leadId) {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('id, website, company_name')
        .eq('id', leadId)
        .single();

      if (error || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }

      const result = await auditWebsite(lead.website);

      // Update lead with audit results
      await supabase
        .from('leads')
        .update({
          opportunity_type: result.opportunityType,
          digital_score: result.score,
          last_audit_at: result.auditedAt,
          audit_data: result,
        })
        .eq('id', leadId);

      return NextResponse.json({
        result,
        leadId: lead.id,
        companyName: lead.company_name,
      });
    }

    // ── Market scan: audit all prospects in batch ──
    if (action === 'market-scan') {
      const { prospects, companyId, userId, city, businessType } = body;

      if (!Array.isArray(prospects) || prospects.length === 0) {
        return NextResponse.json({ error: 'prospects array required' }, { status: 400 });
      }

      const maxScan = 50;
      const limited = prospects.slice(0, maxScan);
      const websiteUrls = limited.map((p: { website?: string }) => p.website || null);

      const results = await batchAudit(websiteUrls, 5);

      // Classify results
      let noWebsite = 0;
      let brokenWebsite = 0;
      let slowWebsite = 0;
      let goodWebsite = 0;
      let totalScore = 0;

      results.forEach(r => {
        switch (r.opportunityType) {
          case 'NO_WEBSITE': noWebsite++; break;
          case 'BROKEN_WEBSITE': brokenWebsite++; break;
          case 'SLOW_WEBSITE': slowWebsite++; break;
          case 'GOOD_PRESENCE': goodWebsite++; break;
        }
        totalScore += r.score;
      });

      // Create snapshot
      const snapshot = {
        my_company_id: companyId,
        user_id: userId,
        city: city || 'Unknown',
        business_type: businessType || 'general',
        total_found: limited.length,
        no_website: noWebsite,
        broken_website: brokenWebsite,
        slow_website: slowWebsite,
        good_website: goodWebsite,
        avg_digital_score: limited.length > 0 ? Math.round(totalScore / limited.length) : 0,
        snapshot_data: {
          results: results.map((r, i) => ({
            name: limited[i]?.name || 'Unknown',
            url: r.url,
            score: r.score,
            type: r.opportunityType,
          })),
          scannedAt: new Date().toISOString(),
        },
      };

      // Save snapshot if companyId and userId provided
      let snapshotId: string | null = null;
      if (companyId && userId) {
        const { data } = await supabase
          .from('market_snapshots')
          .insert(snapshot)
          .select('id')
          .single();
        snapshotId = data?.id || null;
      }

      return NextResponse.json({
        summary: {
          total: limited.length,
          noWebsite,
          brokenWebsite,
          slowWebsite,
          goodWebsite,
          avgScore: snapshot.avg_digital_score,
        },
        results,
        snapshotId,
        truncated: prospects.length > maxScan,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Audit API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
