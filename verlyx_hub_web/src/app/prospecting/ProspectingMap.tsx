'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ProspectMarker, GeoPoint } from '@/lib/map-service';
import type { Lead } from '@/lib/types';

// Fix Leaflet default marker icons (missing in bundlers)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ==========================================
// CUSTOM MARKER ICONS
// ==========================================

function createIcon(color: string, size: [number, number] = [28, 40]) {
  return L.divIcon({
    className: '',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
    html: `<svg width="${size[0]}" height="${size[1]}" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`,
  });
}

const ICONS = {
  prospect: createIcon('#6366f1'),   // indigo — unvisited prospect
  saved: createIcon('#22c55e'),       // green — already a lead
  lead_not_contacted: createIcon('#9ca3af'), // gray
  lead_contacted: createIcon('#3b82f6'),     // blue
  lead_waiting: createIcon('#eab308'),       // yellow
  lead_responded: createIcon('#22c55e'),     // green
  lead_not_interested: createIcon('#ef4444'), // red
  selected: createIcon('#f97316', [34, 48]), // orange, bigger
};

function getLeadIcon(status: string) {
  switch (status) {
    case 'contacted': return ICONS.lead_contacted;
    case 'waiting_response': return ICONS.lead_waiting;
    case 'responded': return ICONS.lead_responded;
    case 'not_interested': return ICONS.lead_not_interested;
    default: return ICONS.lead_not_contacted;
  }
}

// ==========================================
// PROPS
// ==========================================

interface ProspectingMapProps {
  center: GeoPoint;
  zoom: number;
  prospects: ProspectMarker[];
  leads: Lead[];
  selectedProspect: ProspectMarker | null;
  onSelectProspect: (p: ProspectMarker | null) => void;
  onSelectLead: (l: Lead) => void;
  onMapMove: (center: GeoPoint) => void;
  onSaveProspect: (p: ProspectMarker) => void;
  searchRadius: number;
}

// ==========================================
// MAP COMPONENT
// ==========================================

export default function ProspectingMap({
  center,
  zoom,
  prospects,
  leads,
  selectedProspect,
  onSelectProspect,
  onSelectLead,
  onMapMove,
  onSaveProspect,
  searchRadius,
}: ProspectingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const prospectLayerRef = useRef<L.LayerGroup | null>(null);
  const leadLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const isProgrammaticMove = useRef(false);
  const prevCenter = useRef({ lat: center.lat, lng: center.lng });
  const prevZoom = useRef(zoom);

  // Set of existing OSM IDs (to mark "already saved")
  const savedOsmIds = useMemo(
    () => new Set(leads.filter(l => l.osmId).map(l => l.osmId)),
    [leads]
  );

  // Stable callback ref for onMapMove
  const onMapMoveRef = useRef(onMapMove);
  onMapMoveRef.current = onMapMove;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // OSM tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Create layer groups
    prospectLayerRef.current = L.layerGroup().addTo(map);
    leadLayerRef.current = L.layerGroup().addTo(map);

    // Track map center when user pans (not programmatic moves)
    map.on('moveend', () => {
      if (isProgrammaticMove.current) {
        isProgrammaticMove.current = false;
        return;
      }
      const c = map.getCenter();
      onMapMoveRef.current({ lat: c.lat, lng: c.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center/zoom from props — only when it actually changed programmatically
  // (not from user panning, which already updated the map)
  useEffect(() => {
    if (!mapRef.current) return;
    const latDiff = Math.abs(center.lat - prevCenter.current.lat);
    const lngDiff = Math.abs(center.lng - prevCenter.current.lng);
    const zoomChanged = zoom !== prevZoom.current;

    // Only fly to new position if the change is significant (> ~100m) or zoom changed
    if (latDiff > 0.001 || lngDiff > 0.001 || zoomChanged) {
      isProgrammaticMove.current = true;
      mapRef.current.setView([center.lat, center.lng], zoom, { animate: true });
    }

    prevCenter.current = { lat: center.lat, lng: center.lng };
    prevZoom.current = zoom;
  }, [center.lat, center.lng, zoom]);

  // Render radius circle
  useEffect(() => {
    if (!mapRef.current) return;

    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }

    radiusCircleRef.current = L.circle([center.lat, center.lng], {
      radius: searchRadius * 1000,
      color: '#6366f1',
      fillColor: '#6366f1',
      fillOpacity: 0.05,
      weight: 1,
      dashArray: '6 4',
    }).addTo(mapRef.current);
  }, [center.lat, center.lng, searchRadius]);

  // Render prospect markers
  useEffect(() => {
    if (!prospectLayerRef.current) return;
    prospectLayerRef.current.clearLayers();

    prospects.forEach((p) => {
      const isSaved = savedOsmIds.has(p.osmId);
      const isSelected = selectedProspect?.id === p.id;
      const icon = isSelected ? ICONS.selected : (isSaved ? ICONS.saved : ICONS.prospect);

      const marker = L.marker([p.lat, p.lng], { icon })
        .bindPopup(() => {
          const div = document.createElement('div');
          div.className = 'text-sm';
          div.innerHTML = `
            <div style="min-width: 200px;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${escapeHtml(p.name)}</div>
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${escapeHtml(p.businessType)}</div>
              ${p.address ? `<div style="color: #9ca3af; font-size: 12px; margin-bottom: 6px;">${escapeHtml(p.address)}</div>` : ''}
              ${p.phone ? `<div style="font-size: 12px; margin-bottom: 2px;">📞 ${escapeHtml(p.phone)}</div>` : ''}
              ${p.website ? `<div style="font-size: 12px; margin-bottom: 2px;">🌐 <a href="${escapeHtml(p.website)}" target="_blank" style="color: #2563eb;">${escapeHtml(p.website)}</a></div>` : ''}
              ${p.openingHours ? `<div style="font-size: 12px; margin-bottom: 4px;">🕐 ${escapeHtml(p.openingHours)}</div>` : ''}
              ${p.distance != null ? `<div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px;">${p.distance.toFixed(1)} km</div>` : ''}
              <div style="margin-top: 8px; display: flex; gap: 8px;">
                ${!isSaved
                  ? `<button id="save-${p.id}" style="background: #2563eb; color: white; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">+ Guardar lead</button>`
                  : `<span style="color: #16a34a; font-size: 12px; font-weight: 500;">✓ Ya guardado</span>`
                }
                ${p.phone ? `<a href="https://wa.me/${p.phone.replace(/[^\\d+]/g, '').replace(/^\\+/, '')}" target="_blank" style="background: #22c55e; color: white; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; text-decoration: none;">WhatsApp</a>` : ''}
              </div>
            </div>
          `;

          // Attach save handler
          setTimeout(() => {
            const saveBtn = div.querySelector(`#save-${p.id}`);
            if (saveBtn) {
              saveBtn.addEventListener('click', () => onSaveProspect(p));
            }
          }, 50);

          return div;
        });

      marker.on('click', () => onSelectProspect(p));
      marker.addTo(prospectLayerRef.current!);
    });
  }, [prospects, selectedProspect, savedOsmIds, onSelectProspect, onSaveProspect]);

  // Render lead markers
  useEffect(() => {
    if (!leadLayerRef.current) return;
    leadLayerRef.current.clearLayers();

    leads.forEach((l) => {
      if (l.lat == null || l.lng == null) return;
      const icon = getLeadIcon(l.status);

      const marker = L.marker([l.lat, l.lng], { icon })
        .bindPopup(`
          <div style="min-width: 180px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${escapeHtml(l.companyName)}</div>
            ${l.businessType ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${escapeHtml(l.businessType)}</div>` : ''}
            <div style="font-size: 12px; margin-bottom: 2px;">Estado: <strong>${escapeHtml(getStatusLabel(l.status))}</strong></div>
            <div style="font-size: 12px;">Score: <strong>${l.prospectScore}</strong></div>
          </div>
        `);

      marker.on('click', () => onSelectLead(l));
      marker.addTo(leadLayerRef.current!);
    });
  }, [leads, onSelectLead]);

  return (
    <div ref={mapContainerRef} className="w-full h-full relative z-0" style={{ minHeight: 400 }} />
  );
}

// ==========================================
// HELPERS
// ==========================================

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_contacted: 'Sin contactar',
    contacted: 'Contactado',
    waiting_response: 'Esperando respuesta',
    responded: 'Respondió',
    not_interested: 'No interesado',
  };
  return labels[status] || status;
}
