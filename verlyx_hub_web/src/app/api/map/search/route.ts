// ============================================================
// MAP SEARCH API — Overpass + Nominatim Proxy
// Verlyx Hub Enterprise Architecture
// ============================================================
// Server-side proxy to avoid CORS issues and rate limiting.
// Supports: geocoding, business search via Overpass,
// and AI-powered natural language → OSM tags conversion.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'geocode':
        return handleGeocode(body);
      case 'reverse':
        return handleReverseGeocode(body);
      case 'search':
        return handleOverpassSearch(body);
      case 'ai-search':
        return handleAISearch(body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Map API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==========================================
// GEOCODE
// ==========================================

async function handleGeocode(body: { query: string }) {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', body.query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'VerlyxHub/1.0', 'Accept-Language': 'es' },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ results: data });
}

// ==========================================
// REVERSE GEOCODE
// ==========================================

async function handleReverseGeocode(body: { lat: number; lng: number }) {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', body.lat.toString());
  url.searchParams.set('lon', body.lng.toString());
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'VerlyxHub/1.0', 'Accept-Language': 'es' },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ result: data });
}

// ==========================================
// OVERPASS BUSINESS SEARCH
// ==========================================

async function handleOverpassSearch(body: {
  tags: Record<string, string>;
  bounds?: { south: number; west: number; north: number; east: number };
  center?: { lat: number; lng: number };
  radiusKm?: number;
}) {
  const { tags, bounds, center, radiusKm } = body;

  if (!tags || Object.keys(tags).length === 0) {
    return NextResponse.json({ error: 'Tags required' }, { status: 400 });
  }

  const tagFilters = Object.entries(tags)
    .map(([k, v]) => {
      if (v === '*') return `["${k}"]`;
      if (v.includes('|')) return `["${k}"~"${v}"]`;
      return `["${k}"="${v}"]`;
    })
    .join('');

  let query: string;
  if (center && radiusKm) {
    query = `[out:json][timeout:25];(node${tagFilters}(around:${radiusKm * 1000},${center.lat},${center.lng});way${tagFilters}(around:${radiusKm * 1000},${center.lat},${center.lng}););out center tags;`;
  } else if (bounds) {
    const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    query = `[out:json][timeout:25];(node${tagFilters}(${bbox});way${tagFilters}(${bbox}););out center tags;`;
  } else {
    return NextResponse.json({ error: 'Provide bounds or center+radiusKm' }, { status: 400 });
  }

  const response = await fetch(OVERPASS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Overpass API error' }, { status: response.status });
  }

  const data = await response.json();
  const elements = (data.elements || [])
    .filter((el: any) => el.tags?.name)
    .map((el: any) => ({
      id: `${el.type}-${el.id}`,
      osmId: el.id,
      osmType: el.type,
      name: el.tags.name || 'Sin nombre',
      businessType: el.tags.shop || el.tags.amenity || el.tags.office || el.tags.craft || 'business',
      lat: el.lat || el.center?.lat || 0,
      lng: el.lon || el.center?.lon || 0,
      address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']].filter(Boolean).join(', '),
      phone: el.tags.phone || el.tags['contact:phone'] || null,
      website: el.tags.website || el.tags['contact:website'] || null,
      email: el.tags.email || el.tags['contact:email'] || null,
      openingHours: el.tags.opening_hours || null,
      tags: el.tags,
    }));

  return NextResponse.json({ results: elements, total: elements.length });
}

// ==========================================
// AI-POWERED SEARCH (natural language → OSM tags)
// ==========================================

async function handleAISearch(body: {
  query: string;
  center?: { lat: number; lng: number };
  radiusKm?: number;
  bounds?: { south: number; west: number; north: number; east: number };
}) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }

  // Use AI Router to interpret tags
  const { getAIRouter } = await import('@/lib/ai-router');
  const router = getAIRouter();

  const tagResult = await router.interpretTags(body.query);

  // Now search with interpreted tags
  const searchBody = {
    action: 'search' as const,
    tags: tagResult.tags,
    center: body.center,
    radiusKm: body.radiusKm || 5,
    bounds: body.bounds,
  };

  return handleOverpassSearch(searchBody);
}
