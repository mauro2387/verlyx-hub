// ============================================================
// DIGITAL AUDIT ENGINE
// Verlyx Hub Enterprise Architecture
// ============================================================
// Analyzes a business's digital presence via lightweight
// HTTP-only checks. NO Playwright/Puppeteer — Vercel-compatible.
// ============================================================

export type OpportunityType =
  | 'NO_WEBSITE'
  | 'BROKEN_WEBSITE'
  | 'SLOW_WEBSITE'
  | 'BAD_SEO'
  | 'LOW_DIGITAL_PRESENCE'
  | 'GOOD_PRESENCE';

export interface DigitalAuditBreakdown {
  https: boolean;            // +15 pts
  accessible: boolean;       // +20 pts
  hasTitle: boolean;         // +10 pts
  hasDescription: boolean;   // +10 pts
  hasFavicon: boolean;       // +5 pts
  hasSocialLinks: boolean;   // +10 pts
  mobileViewport: boolean;   // +15 pts
  loadTimeMs: number;        // up to +15 pts if < 2000ms
}

export interface DigitalAuditResult {
  url: string;
  score: number; // 0-100
  opportunityType: OpportunityType;
  breakdown: DigitalAuditBreakdown;
  detectedIssues: string[];
  recommendations: string[];
  socialLinks: string[];
  auditedAt: string;
}

// ==========================================
// SCORING
// ==========================================

function computeScore(breakdown: DigitalAuditBreakdown): number {
  let score = 0;
  if (breakdown.https) score += 15;
  if (breakdown.accessible) score += 20;
  if (breakdown.hasTitle) score += 10;
  if (breakdown.hasDescription) score += 10;
  if (breakdown.hasFavicon) score += 5;
  if (breakdown.hasSocialLinks) score += 10;
  if (breakdown.mobileViewport) score += 15;

  // Load time bonus: < 2000ms = +15, < 4000ms = +10, < 6000ms = +5
  if (breakdown.loadTimeMs > 0 && breakdown.loadTimeMs < 2000) {
    score += 15;
  } else if (breakdown.loadTimeMs > 0 && breakdown.loadTimeMs < 4000) {
    score += 10;
  } else if (breakdown.loadTimeMs > 0 && breakdown.loadTimeMs < 6000) {
    score += 5;
  }

  return Math.min(score, 100);
}

function classifyOpportunity(score: number, breakdown: DigitalAuditBreakdown): OpportunityType {
  if (!breakdown.accessible) return 'BROKEN_WEBSITE';
  if (breakdown.loadTimeMs > 6000) return 'SLOW_WEBSITE';
  if (!breakdown.hasTitle && !breakdown.hasDescription) return 'BAD_SEO';
  if (!breakdown.hasSocialLinks && !breakdown.mobileViewport) return 'LOW_DIGITAL_PRESENCE';
  if (score >= 60) return 'GOOD_PRESENCE';
  return 'LOW_DIGITAL_PRESENCE';
}

function generateIssues(breakdown: DigitalAuditBreakdown): string[] {
  const issues: string[] = [];
  if (!breakdown.https) issues.push('El sitio no usa HTTPS — inseguro para visitantes');
  if (!breakdown.accessible) issues.push('El sitio no responde o devuelve un error HTTP');
  if (!breakdown.hasTitle) issues.push('Falta la etiqueta <title> — invisible para Google');
  if (!breakdown.hasDescription) issues.push('Falta la meta description — mal posicionamiento SEO');
  if (!breakdown.hasFavicon) issues.push('Sin favicon — el sitio se ve poco profesional en pestañas');
  if (!breakdown.hasSocialLinks) issues.push('No se detectan enlaces a redes sociales');
  if (!breakdown.mobileViewport) issues.push('Sin viewport responsive — mala experiencia en móviles');
  if (breakdown.loadTimeMs > 4000) issues.push(`Tiempo de carga alto: ${(breakdown.loadTimeMs / 1000).toFixed(1)}s`);
  return issues;
}

function generateRecommendations(type: OpportunityType, breakdown: DigitalAuditBreakdown): string[] {
  const recs: string[] = [];

  switch (type) {
    case 'NO_WEBSITE':
      recs.push('Crear un sitio web profesional con dominio propio');
      recs.push('Configurar Google My Business para aparecer en búsquedas locales');
      recs.push('Agregar perfiles en redes sociales (Instagram, Facebook)');
      break;
    case 'BROKEN_WEBSITE':
      recs.push('Reparar o rediseñar el sitio web — actualmente no es accesible');
      recs.push('Verificar el hosting y dominio');
      recs.push('Considerar migrar a una plataforma moderna (WordPress, Next.js)');
      break;
    case 'SLOW_WEBSITE':
      recs.push('Optimizar imágenes y recursos para reducir tiempo de carga');
      recs.push('Implementar CDN y caché del navegador');
      recs.push('Considerar un hosting más rápido o servicio de performance');
      break;
    case 'BAD_SEO':
      recs.push('Agregar title y meta description optimizados para SEO');
      if (!breakdown.hasFavicon) recs.push('Agregar un favicon profesional');
      recs.push('Configurar Google Search Console para monitorear posicionamiento');
      recs.push('Crear contenido relevante con palabras clave del negocio');
      break;
    case 'LOW_DIGITAL_PRESENCE':
      recs.push('Crear perfiles activos en redes sociales relevantes');
      if (!breakdown.mobileViewport) recs.push('Hacer el sitio responsive para dispositivos móviles');
      recs.push('Implementar estrategia de contenido y presencia digital');
      break;
    case 'GOOD_PRESENCE':
      recs.push('Optimizar campañas de marketing digital');
      recs.push('Implementar analytics avanzado para medir conversiones');
      recs.push('Considerar publicidad digital (Google Ads, Meta Ads)');
      break;
  }

  return recs;
}

// ==========================================
// HTML PARSING (lightweight, no external deps)
// ==========================================

function extractTag(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match ? match[1]?.trim() || null : null;
}

function extractSocialLinks(html: string): string[] {
  const socialPatterns = [
    /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>]+/gi,
    /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>]+/gi,
    /https?:\/\/(www\.)?twitter\.com\/[^\s"'<>]+/gi,
    /https?:\/\/(www\.)?x\.com\/[^\s"'<>]+/gi,
    /https?:\/\/(www\.)?linkedin\.com\/[^\s"'<>]+/gi,
    /https?:\/\/(www\.)?youtube\.com\/[^\s"'<>]+/gi,
    /https?:\/\/(www\.)?tiktok\.com\/[^\s"'<>]+/gi,
  ];

  const links: string[] = [];
  for (const pattern of socialPatterns) {
    const matches = html.match(pattern);
    if (matches) links.push(...matches.map(m => m.trim()));
  }
  return [...new Set(links)]; // deduplicate
}

// ==========================================
// MAIN AUDIT FUNCTION
// ==========================================

/**
 * Run a digital audit on a URL. Vercel-safe (fetch only).
 * For leads without a website, returns NO_WEBSITE result.
 */
export async function auditWebsite(urlInput: string | null | undefined): Promise<DigitalAuditResult> {
  const now = new Date().toISOString();

  // No website = immediate classification
  if (!urlInput || !urlInput.trim()) {
    return {
      url: '',
      score: 0,
      opportunityType: 'NO_WEBSITE',
      breakdown: {
        https: false,
        accessible: false,
        hasTitle: false,
        hasDescription: false,
        hasFavicon: false,
        hasSocialLinks: false,
        mobileViewport: false,
        loadTimeMs: 0,
      },
      detectedIssues: ['El negocio no tiene sitio web'],
      recommendations: generateRecommendations('NO_WEBSITE', {} as DigitalAuditBreakdown),
      socialLinks: [],
      auditedAt: now,
    };
  }

  // Normalize URL
  let url = urlInput.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const breakdown: DigitalAuditBreakdown = {
    https: url.startsWith('https://'),
    accessible: false,
    hasTitle: false,
    hasDescription: false,
    hasFavicon: false,
    hasSocialLinks: false,
    mobileViewport: false,
    loadTimeMs: 0,
  };

  let socialLinks: string[] = [];

  try {
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VerlyxHubBot/1.0; +https://verlyx.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    breakdown.loadTimeMs = Date.now() - startTime;

    if (response.ok) {
      breakdown.accessible = true;

      // Check if redirected to HTTPS
      if (response.url.startsWith('https://')) {
        breakdown.https = true;
      }

      const html = await response.text();
      const head = html.substring(0, 15000); // only scan head area

      // Title check
      const title = extractTag(head, /<title[^>]*>([^<]+)<\/title>/i);
      breakdown.hasTitle = !!title && title.length > 3;

      // Meta description
      const desc = extractTag(head, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
                || extractTag(head, /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      breakdown.hasDescription = !!desc && desc.length > 10;

      // Favicon
      breakdown.hasFavicon = /(<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>|<link[^>]*rel=["']apple-touch-icon["'][^>]*>)/i.test(head);

      // Mobile viewport
      breakdown.mobileViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(head);

      // Social links
      socialLinks = extractSocialLinks(html.substring(0, 50000));
      breakdown.hasSocialLinks = socialLinks.length > 0;
    } else {
      // HTTP error
      breakdown.accessible = false;
      breakdown.loadTimeMs = Date.now() - startTime;
    }
  } catch (error: unknown) {
    // Network error, timeout, etc.
    breakdown.accessible = false;
    if (error instanceof Error && error.name === 'AbortError') {
      breakdown.loadTimeMs = 12000; // timed out
    }
  }

  const score = computeScore(breakdown);
  const opportunityType = classifyOpportunity(score, breakdown);

  return {
    url,
    score,
    opportunityType,
    breakdown,
    detectedIssues: generateIssues(breakdown),
    recommendations: generateRecommendations(opportunityType, breakdown),
    socialLinks,
    auditedAt: now,
  };
}

/**
 * Batch audit multiple URLs. Returns results in order.
 * Processes in parallel with concurrency limit.
 */
export async function batchAudit(
  urls: (string | null | undefined)[],
  concurrency = 5
): Promise<DigitalAuditResult[]> {
  const results: DigitalAuditResult[] = new Array(urls.length);

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(u => auditWebsite(u)));
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }

  return results;
}

// ==========================================
// OPPORTUNITY LABELS (Spanish)
// ==========================================

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, { label: string; description: string; color: string; icon: string }> = {
  NO_WEBSITE: {
    label: 'Sin sitio web',
    description: 'El negocio no tiene presencia web',
    color: '#EF4444',
    icon: '🔴',
  },
  BROKEN_WEBSITE: {
    label: 'Web rota',
    description: 'El sitio web no responde o tiene errores',
    color: '#DC2626',
    icon: '💔',
  },
  SLOW_WEBSITE: {
    label: 'Web lenta',
    description: 'El sitio carga en más de 6 segundos',
    color: '#F97316',
    icon: '🐌',
  },
  BAD_SEO: {
    label: 'SEO deficiente',
    description: 'Falta título, descripción o meta tags básicos',
    color: '#EAB308',
    icon: '🔍',
  },
  LOW_DIGITAL_PRESENCE: {
    label: 'Presencia digital débil',
    description: 'Sin redes sociales o no es responsive',
    color: '#F59E0B',
    icon: '📉',
  },
  GOOD_PRESENCE: {
    label: 'Buena presencia',
    description: 'El negocio tiene presencia digital sólida',
    color: '#22C55E',
    icon: '✅',
  },
};
