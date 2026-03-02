// ============================================================
// PROSPECTING MAP SERVICE
// Verlyx Hub Enterprise Architecture
// ============================================================
// Handles geolocation, Overpass API queries, and Nominatim
// geocoding. NO Google Maps API.
// ============================================================

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  boundingbox?: [string, string, string, string];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface ProspectMarker {
  id: string;
  osmId: number;
  osmType: string;
  name: string;
  businessType: string;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
  openingHours?: string;
  tags: Record<string, string>;
  distance?: number; // km from search center
}

// ==========================================
// NOMINATIM GEOCODING
// ==========================================

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * Forward geocoding: address/place name → coordinates
 */
export async function geocode(query: string): Promise<NominatimResult[]> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'VerlyxHub/1.0',
      'Accept-Language': 'es',
    },
  });

  if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);
  return response.json();
}

/**
 * Reverse geocoding: coordinates → address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lng.toString());
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'VerlyxHub/1.0',
      'Accept-Language': 'es',
    },
  });

  if (!response.ok) return null;
  return response.json();
}

// ==========================================
// OVERPASS API — Business Search
// ==========================================

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';

/**
 * Build an Overpass QL query from OSM tags within a bounding box.
 */
export function buildOverpassQuery(
  bounds: GeoBounds,
  tags: Record<string, string>,
  radius?: { center: GeoPoint; meters: number }
): string {
  const tagFilters = Object.entries(tags)
    .map(([k, v]) => {
      if (v === '*') return `["${k}"]`;
      if (v.includes('|')) return `["${k}"~"${v}"]`;
      return `["${k}"="${v}"]`;
    })
    .join('');

  if (radius) {
    // Search by radius around a point
    return `
[out:json][timeout:25];
(
  node${tagFilters}(around:${radius.meters},${radius.center.lat},${radius.center.lng});
  way${tagFilters}(around:${radius.meters},${radius.center.lat},${radius.center.lng});
);
out center tags;
`.trim();
  }

  // Search within bounding box
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  return `
[out:json][timeout:25];
(
  node${tagFilters}(${bbox});
  way${tagFilters}(${bbox});
);
out center tags;
`.trim();
}

/**
 * Execute an Overpass API query.
 */
export async function queryOverpass(query: string): Promise<OverpassElement[]> {
  const response = await fetch(OVERPASS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.elements || [];
}

/**
 * Search for businesses by OSM tags in an area.
 * Returns normalized ProspectMarker objects.
 */
export async function searchBusinesses(
  tags: Record<string, string>,
  options: {
    bounds?: GeoBounds;
    center?: GeoPoint;
    radiusKm?: number;
  }
): Promise<ProspectMarker[]> {
  const { bounds, center, radiusKm } = options;

  let query: string;
  if (center && radiusKm) {
    query = buildOverpassQuery(
      bounds || { south: 0, west: 0, north: 0, east: 0 },
      tags,
      { center, meters: radiusKm * 1000 }
    );
  } else if (bounds) {
    query = buildOverpassQuery(bounds, tags);
  } else {
    throw new Error('Either bounds or center+radius must be provided');
  }

  const elements = await queryOverpass(query);

  return elements
    .filter(el => el.tags?.name) // Only named places
    .map(el => {
      const lat = el.lat || el.center?.lat || 0;
      const lng = el.lon || el.center?.lon || 0;
      const elTags = el.tags || {};

      // Determine business type from tags
      const businessType = elTags.shop || elTags.amenity || elTags.office || 
                           elTags.craft || elTags.tourism || elTags.leisure || 'business';

      // Build address from tags
      const addressParts = [
        elTags['addr:street'],
        elTags['addr:housenumber'],
        elTags['addr:city'],
      ].filter(Boolean);

      const marker: ProspectMarker = {
        id: `${el.type}-${el.id}`,
        osmId: el.id,
        osmType: el.type,
        name: elTags.name || 'Sin nombre',
        businessType,
        lat,
        lng,
        address: addressParts.length > 0 ? addressParts.join(', ') : '',
        phone: elTags.phone || elTags['contact:phone'],
        website: elTags.website || elTags['contact:website'],
        email: elTags.email || elTags['contact:email'],
        openingHours: elTags.opening_hours,
        tags: elTags,
      };

      // Calculate distance from search center
      if (center) {
        marker.distance = haversineDistance(center, { lat, lng });
      }

      return marker;
    })
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

// ==========================================
// COMMON OSM TAG PRESETS
// ==========================================

export const BUSINESS_PRESETS: Record<string, { label: string; tags: Record<string, string> }> = {
  restaurants: { label: 'Restaurantes', tags: { amenity: 'restaurant' } },
  cafes: { label: 'Cafeterías', tags: { amenity: 'cafe' } },
  bars: { label: 'Bares', tags: { amenity: 'bar' } },
  shops: { label: 'Tiendas', tags: { shop: '*' } },
  supermarkets: { label: 'Supermercados', tags: { shop: 'supermarket' } },
  pharmacies: { label: 'Farmacias', tags: { amenity: 'pharmacy' } },
  hotels: { label: 'Hoteles', tags: { tourism: 'hotel' } },
  gyms: { label: 'Gimnasios', tags: { leisure: 'fitness_centre' } },
  dentists: { label: 'Dentistas', tags: { amenity: 'dentist' } },
  doctors: { label: 'Clínicas', tags: { amenity: 'clinic|doctors' } },
  offices: { label: 'Oficinas', tags: { office: '*' } },
  coworking: { label: 'Coworking', tags: { amenity: 'coworking_space' } },
  beauty: { label: 'Peluquerías / Estética', tags: { shop: 'hairdresser|beauty' } },
  car_repair: { label: 'Talleres mecánicos', tags: { shop: 'car_repair' } },
  education: { label: 'Educación', tags: { amenity: 'school|college|university' } },
  veterinary: { label: 'Veterinarias', tags: { amenity: 'veterinary' } },
  bakeries: { label: 'Panaderías', tags: { shop: 'bakery' } },
};

// ==========================================
// UTILS
// ==========================================

/**
 * Haversine distance in km between two geo points.
 */
function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => deg * (Math.PI / 180);
  
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    Math.sin(dLng / 2) ** 2;
  
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Get current user position via browser geolocation.
 */
export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Build a wa.me link for WhatsApp outreach.
 */
export function buildWhatsAppLink(phone: string, message?: string): string {
  // Clean phone number (keep + and digits only)
  const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const base = `https://wa.me/${cleanPhone}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}
