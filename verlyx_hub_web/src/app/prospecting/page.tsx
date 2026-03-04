'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout';
import { Button, Card, CardContent, Loading, Modal, Input, Textarea, SearchInput } from '@/components/ui';
import { useLeadsStore, useCompanyStore } from '@/lib/store';
import { Lead, LeadStatus, LeadSource, ContactChannel } from '@/lib/types';
import { OPPORTUNITY_TYPE_LABELS } from '@/lib/digital-audit';
import { BUSINESS_PRESETS, type ProspectMarker, type GeoPoint } from '@/lib/map-service';
import { formatDate, cn } from '@/lib/utils';

// Dynamic import — Leaflet doesn't support SSR
const ProspectingMap = dynamic(() => import('./ProspectingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
      <Loading />
    </div>
  ),
});

// ==========================================
// CONSTANTS
// ==========================================

const LEAD_STATUS_LABELS: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  not_contacted: { label: 'Sin contactar', color: 'text-gray-700', bg: 'bg-gray-100' },
  contacted: { label: 'Contactado', color: 'text-blue-700', bg: 'bg-blue-100' },
  waiting_response: { label: 'Esperando respuesta', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  responded: { label: 'Respondió', color: 'text-green-700', bg: 'bg-green-100' },
  not_interested: { label: 'No interesado', color: 'text-red-700', bg: 'bg-red-100' },
};

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  map: 'Mapa',
  manual: 'Manual',
  referral: 'Referido',
  social: 'Redes sociales',
  website: 'Sitio web',
  campaign: 'Campaña',
  other: 'Otro',
};

const CHANNEL_OPTIONS: { value: ContactChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Llamada' },
  { value: 'in_person', label: 'Presencial' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'other', label: 'Otro' },
];

type ViewMode = 'map' | 'list' | 'campaigns';

interface ProspectGroup {
  id: string;
  title: string;
  prospects: ProspectMarker[];
}

interface LeadFormData {
  companyName: string;
  businessType: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  source: LeadSource;
  channel: ContactChannel | '';
  notes: string;
  prospectScore: number;
}

const emptyForm: LeadFormData = {
  companyName: '',
  businessType: '',
  address: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  source: 'manual',
  channel: '',
  notes: '',
  prospectScore: 50,
};

// ==========================================
// HELPER: Auto-score a lead based on data quality
// ==========================================
function computeAutoScore(prospect: ProspectMarker): number {
  let score = 10; // base
  if (prospect.email) score += 25;
  if (prospect.phone) score += 20;
  if (prospect.website) score += 20;
  if (prospect.address) score += 10;
  if (prospect.name) score += 5;
  return Math.min(score, 100);
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function ProspectingPage() {
  const {
    leads, isLoading, fetchLeads, createLead, updateLead, deleteLead,
    convertToOpportunity, auditLead, generateProposal, runMarketScan,
  } = useLeadsStore();
  const { selectedCompanyId } = useCompanyStore();

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');

  // Map state
  const [mapCenter, setMapCenter] = useState<GeoPoint>({ lat: -34.9011, lng: -56.1645 }); // Montevideo
  const [mapZoom, setMapZoom] = useState(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [searchRadius, setSearchRadius] = useState(2); // km
  const [prospectResults, setProspectResults] = useState<ProspectMarker[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<ProspectMarker | null>(null);

  // Modal state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(emptyForm);
  const [isConverting, setIsConverting] = useState(false);

  // Detail panel
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // Bulk selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<{ sent: number; failed: number; noEmail: number } | null>(null);

  // WhatsApp bulk
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waOpenedIndexes, setWaOpenedIndexes] = useState<Set<number>>(new Set());

  // Prospecting groups
  const [prospectGroups, setProspectGroups] = useState<ProspectGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');

  // City for Google search
  const [searchCity, setSearchCity] = useState('');

  // Business Radar / digital audit
  const [colorMode, setColorMode] = useState<'status' | 'digital'>('status');
  const [isAuditing, setIsAuditing] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [marketScanResult, setMarketScanResult] = useState<{ totalAudited: number; avgScore: number; byType: Record<string, number> } | null>(null);

  // Pre-compute leads with coords (needed by handlers)
  const leadsWithCoords = useMemo(
    () => leads.filter(l => l.lat != null && l.lng != null && !l.convertedToOpportunityId),
    [leads]
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Try to get user location on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {/* keep default Montevideo */},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // ==========================================
  // SEARCH (via server proxy)
  // ==========================================

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const body: Record<string, unknown> = {
        action: 'search',
        center: mapCenter,
        radiusKm: searchRadius,
      };

      if (selectedPreset && BUSINESS_PRESETS[selectedPreset]) {
        body.tags = BUSINESS_PRESETS[selectedPreset].tags;
      } else if (searchQuery.trim()) {
        body.action = 'ai-search';
        body.query = searchQuery.trim();
      } else {
        body.tags = { shop: '*' };
      }

      const res = await fetch('/api/map/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.error && (!data.results || data.results.length === 0)) {
        console.warn('Search warning:', data.error);
      }

      setProspectResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setProspectResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [mapCenter, searchRadius, selectedPreset, searchQuery]);

  const handleLocationSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    // Capture city name from the search query
    setSearchCity(query.trim());
    try {
      const res = await fetch('/api/map/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'geocode', query }),
      });
      const data = await res.json();
      if (data.results?.length > 0) {
        const r = data.results[0];
        setMapCenter({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
      }
    } catch {/* ignore */}
  }, []);

  // ==========================================
  // PROSPECTING GROUPS
  // ==========================================

  const handleCreateGroup = useCallback((title: string) => {
    if (!title.trim()) return;
    const newGroup: ProspectGroup = {
      id: crypto.randomUUID(),
      title: title.trim(),
      prospects: [],
    };
    setProspectGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    setIsGroupModalOpen(false);
    setNewGroupTitle('');
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setProspectGroups(prev => prev.filter(g => g.id !== groupId));
    if (activeGroupId === groupId) setActiveGroupId(null);
  }, [activeGroupId]);

  const handleCopyGroupNames = useCallback((groupId: string) => {
    const group = prospectGroups.find(g => g.id === groupId);
    if (group && group.prospects.length > 0) {
      const names = group.prospects.map(p => p.name).join(', ');
      navigator.clipboard.writeText(names);
    }
  }, [prospectGroups]);

  /** Build the Google search query: name + city */
  const googleSearchQuery = useCallback((name: string) => {
    return name + (searchCity ? ' ' + searchCity : '');
  }, [searchCity]);

  // ==========================================
  // DIGITAL AUDIT / PROPOSAL / MARKET SCAN
  // ==========================================

  const handleAuditLead = useCallback(async (leadId: string) => {
    setIsAuditing(true);
    try {
      await auditLead(leadId);
      // Refresh detail panel if this lead is selected
      const updated = useLeadsStore.getState().leads.find(l => l.id === leadId);
      if (updated && detailLead?.id === leadId) setDetailLead(updated);
    } finally {
      setIsAuditing(false);
    }
  }, [auditLead, detailLead]);

  const handleGenerateProposal = useCallback(async (leadId: string) => {
    setIsGeneratingProposal(true);
    try {
      const result = await generateProposal(leadId);
      if (result?.html) {
        // Open proposal in a new tab
        const w = window.open('', '_blank');
        if (w) { w.document.write(result.html as string); w.document.close(); }
      }
    } finally {
      setIsGeneratingProposal(false);
    }
  }, [generateProposal]);

  const handleMarketScan = useCallback(async () => {
    if (leadsWithCoords.length === 0) return;
    setIsScanning(true);
    setMarketScanResult(null);
    try {
      const prospects = leadsWithCoords
        .filter(l => l.website)
        .slice(0, 20)
        .map(l => ({ url: l.website!, name: l.companyName }));
      if (prospects.length === 0) return;
      const result = await runMarketScan(
        prospects,
        searchCity || 'Sin ciudad',
        selectedPreset ? (BUSINESS_PRESETS[selectedPreset]?.label || 'General') : 'General'
      );
      if (result) {
        const byType: Record<string, number> = {};
        const updatedLeads = useLeadsStore.getState().leads;
        updatedLeads.forEach(l => {
          if (l.opportunityType) byType[l.opportunityType] = (byType[l.opportunityType] || 0) + 1;
        });
        const audited = updatedLeads.filter(l => l.digitalScore !== undefined && l.digitalScore > 0);
        const avg = audited.length > 0 ? Math.round(audited.reduce((a, l) => a + (l.digitalScore || 0), 0) / audited.length) : 0;
        setMarketScanResult({ totalAudited: audited.length, avgScore: avg, byType });
      }
    } finally {
      setIsScanning(false);
    }
  }, [leadsWithCoords, searchCity, selectedPreset, runMarketScan]);

  // ==========================================
  // LEAD CRUD
  // ==========================================

  const handleSaveFromProspect = useCallback(async (prospect: ProspectMarker) => {
    const autoScore = computeAutoScore(prospect);
    const newLead = await createLead({
      companyName: prospect.name,
      businessType: prospect.businessType,
      address: prospect.address,
      lat: prospect.lat,
      lng: prospect.lng,
      contactPhone: prospect.phone,
      contactEmail: prospect.email,
      website: prospect.website,
      source: 'map' as LeadSource,
      status: 'not_contacted' as LeadStatus,
      prospectScore: autoScore,
      osmId: prospect.osmId,
      osmTags: prospect.tags,
    });
    if (newLead) {
      setSelectedProspect(null);
      // Add to active group if one exists
      if (activeGroupId) {
        setProspectGroups(prev => prev.map(g =>
          g.id === activeGroupId
            ? { ...g, prospects: [...g.prospects, prospect] }
            : g
        ));
      }
    }
  }, [createLead, activeGroupId]);

  const openCreateModal = useCallback((overrides?: Partial<LeadFormData>) => {
    setEditingLead(null);
    setFormData({ ...emptyForm, ...overrides });
    setIsLeadModalOpen(true);
  }, []);

  const openEditModal = useCallback((lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      companyName: lead.companyName || '',
      businessType: lead.businessType || '',
      address: lead.address || '',
      contactName: lead.contactName || '',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      website: lead.website || '',
      source: lead.source,
      channel: lead.channel || '',
      notes: lead.notes || '',
      prospectScore: lead.prospectScore || 50,
    });
    setIsLeadModalOpen(true);
  }, []);

  const handleSubmitLead = useCallback(async () => {
    if (!formData.companyName.trim()) return;

    if (editingLead) {
      await updateLead(editingLead.id, {
        companyName: formData.companyName,
        businessType: formData.businessType || undefined,
        address: formData.address || undefined,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
        source: formData.source,
        channel: formData.channel || undefined,
        notes: formData.notes || undefined,
        prospectScore: formData.prospectScore,
      });
    } else {
      await createLead({
        companyName: formData.companyName,
        businessType: formData.businessType || undefined,
        address: formData.address || undefined,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
        source: formData.source,
        channel: (formData.channel || undefined) as ContactChannel | undefined,
        notes: formData.notes || undefined,
        prospectScore: formData.prospectScore,
        status: 'not_contacted',
      });
    }

    setIsLeadModalOpen(false);
    setEditingLead(null);
    setFormData(emptyForm);
  }, [formData, editingLead, createLead, updateLead]);

  const handleConvert = useCallback(async (leadId: string) => {
    setIsConverting(true);
    const oppId = await convertToOpportunity(leadId);
    setIsConverting(false);
    if (oppId) {
      setDetailLead(null);
    }
  }, [convertToOpportunity]);

  // ==========================================
  // BULK EMAIL
  // ==========================================

  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Hide converted leads — they live in Oportunidades now
      if (l.convertedToOpportunityId) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterSource && l.source !== filterSource) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          l.companyName?.toLowerCase().includes(q) ||
          l.contactName?.toLowerCase().includes(q) ||
          l.businessType?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.contactEmail?.toLowerCase().includes(q) ||
          l.contactPhone?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, filterStatus, filterSource, searchTerm]);

  const toggleSelectAll = useCallback(() => {
    setSelectedLeadIds(prev => {
      if (prev.size === filteredLeads.length && filteredLeads.length > 0) return new Set();
      return new Set(filteredLeads.map(l => l.id));
    });
  }, [filteredLeads]);

  const selectedLeadsWithEmail = useMemo(() => {
    return leads.filter(l => selectedLeadIds.has(l.id) && l.contactEmail);
  }, [leads, selectedLeadIds]);

  const selectedLeadsWithPhone = useMemo(() => {
    return leads.filter(l => selectedLeadIds.has(l.id) && l.contactPhone);
  }, [leads, selectedLeadIds]);

  const handleOpenBulkWhatsApp = useCallback(() => {
    setWaMessage('');
    setWaOpenedIndexes(new Set());
    setIsWhatsAppModalOpen(true);
  }, []);

  const buildWaLink = useCallback((phone: string, message: string, lead: Lead) => {
    const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    let personalized = message
      .replace(/\{\{nombre\}\}/g, lead.contactName || lead.companyName || '')
      .replace(/\{\{empresa\}\}/g, lead.companyName || '')
      .replace(/\{\{mi_empresa\}\}/g, 'Pulsarmoon');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(personalized)}`;
  }, []);

  const handleMarkWaSent = useCallback(async (index: number, lead: Lead) => {
    setWaOpenedIndexes(prev => new Set(prev).add(index));
    if (lead.status === 'not_contacted') {
      await updateLead(lead.id, { status: 'contacted', channel: 'whatsapp' });
    }
    // Auto-convert to opportunity
    if (!lead.convertedToOpportunityId) {
      await convertToOpportunity(lead.id);
    }
  }, [updateLead, convertToOpportunity]);

  const handleOpenBulkEmail = useCallback(() => {
    setEmailSubject('');
    setEmailBody('');
    setEmailSendResult(null);
    setIsEmailModalOpen(true);
  }, []);

  const handleSendBulkEmails = useCallback(async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setIsSendingEmails(true);
    setEmailSendResult(null);

    const leadsToEmail = leads.filter(l => selectedLeadIds.has(l.id));
    const withEmail = leadsToEmail.filter(l => l.contactEmail);
    const noEmail = leadsToEmail.length - withEmail.length;
    let sent = 0;
    let failed = 0;

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: withEmail.map(l => ({
            email: l.contactEmail,
            name: l.contactName || l.companyName,
            companyName: l.companyName,
          })),
          subject: emailSubject,
          body: emailBody,
        }),
      });

      const data = await res.json();
      sent = data.sent || 0;
      failed = data.failed || 0;

      // Mark as contacted + auto-convert to opportunity
      for (const lead of withEmail) {
        if (lead.status === 'not_contacted') {
          await updateLead(lead.id, { status: 'contacted', channel: 'email' });
        }
        if (!lead.convertedToOpportunityId) {
          await convertToOpportunity(lead.id);
        }
      }
    } catch (err) {
      console.error('Bulk email error:', err);
      failed = withEmail.length;
    }

    setEmailSendResult({ sent, failed, noEmail });
    setIsSendingEmails(false);
    setSelectedLeadIds(new Set());
  }, [emailSubject, emailBody, leads, selectedLeadIds, updateLead, convertToOpportunity]);

  const handleBulkConvertToOpportunity = useCallback(async () => {
    const contactedLeads = leads.filter(l =>
      selectedLeadIds.has(l.id) &&
      (l.status === 'contacted' || l.status === 'responded') &&
      !l.convertedToOpportunityId
    );

    setIsConverting(true);
    for (const lead of contactedLeads) {
      await convertToOpportunity(lead.id);
    }
    setIsConverting(false);
    setSelectedLeadIds(new Set());
  }, [leads, selectedLeadIds, convertToOpportunity]);

  // ==========================================
  // COMPUTED DATA
  // ==========================================

  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus: Record<string, number> = {};
    leads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
    const avgScore = total > 0 ? Math.round(leads.reduce((a, l) => a + l.prospectScore, 0) / total) : 0;
    const withEmail = leads.filter(l => l.contactEmail).length;
    const withPhone = leads.filter(l => l.contactPhone).length;
    return { total, byStatus, avgScore, withEmail, withPhone };
  }, [leads]);

  const digitalStats = useMemo(() => {
    const audited = leads.filter(l => l.digitalScore !== undefined && l.digitalScore > 0);
    const avgDigital = audited.length > 0 ? Math.round(audited.reduce((a, l) => a + (l.digitalScore || 0), 0) / audited.length) : 0;
    const lowScore = leads.filter(l => l.digitalScore !== undefined && l.digitalScore > 0 && l.digitalScore < 50).length;
    return { audited: audited.length, avgDigital, lowScore };
  }, [leads]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Prospección</h1>
              <p className="text-sm text-gray-500 mt-1">Encuentra, gestiona y contacta leads desde el mapa</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Mapa
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Lista
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('campaigns')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    viewMode === 'campaigns' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Campañas
                  </span>
                </button>
              </div>
              <Button onClick={() => openCreateModal()}>+ Nuevo Lead</Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-8 gap-3">
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Total Leads</div>
              <div className="text-lg font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Sin contactar</div>
              <div className="text-lg font-bold text-gray-600">{stats.byStatus['not_contacted'] || 0}</div>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Contactados</div>
              <div className="text-lg font-bold text-blue-600">{stats.byStatus['contacted'] || 0}</div>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Respondieron</div>
              <div className="text-lg font-bold text-green-600">{stats.byStatus['responded'] || 0}</div>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Con email</div>
              <div className="text-lg font-bold text-indigo-600">{stats.withEmail}</div>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Con teléfono</div>
              <div className="text-lg font-bold text-teal-600">{stats.withPhone}</div>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Auditados</div>
              <div className="text-lg font-bold text-orange-600">{digitalStats.audited}</div>
            </div>
            <div className="bg-white border rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500">Score digital</div>
              <div className="text-lg font-bold text-purple-600">{digitalStats.avgDigital || '—'}</div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-6 pb-6 min-h-0">
          {viewMode === 'map' ? (
            <div className="flex gap-4 h-full">
              {/* Left panel — search & results */}
              <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
                {/* Location search */}
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="text-sm font-medium text-gray-700">Ubicación</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Buscar ciudad, dirección..."
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleLocationSearch((e.target as HTMLInputElement).value);
                        }}
                      />
                      <button
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (pos) => { setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
                              () => {}
                            );
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 border rounded-lg hover:border-blue-300 transition-colors"
                        title="Mi ubicación"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Business search */}
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="text-sm font-medium text-gray-700">Buscar negocios</div>
                    <select
                      value={selectedPreset}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Tipo de negocio...</option>
                      {Object.entries(BUSINESS_PRESETS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>

                    <div className="text-xs text-gray-500">O búsqueda libre:</div>
                    <input
                      type="text"
                      placeholder='Ej: "veterinarias cerca del centro"'
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSelectedPreset(''); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />

                    <div>
                      <label className="text-xs text-gray-500">Radio: {searchRadius} km</label>
                      <input
                        type="range"
                        min={0.5}
                        max={10}
                        step={0.5}
                        value={searchRadius}
                        onChange={(e) => setSearchRadius(parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <Button onClick={handleSearch} disabled={isSearching} className="w-full">
                      {isSearching ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Buscando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Buscar en zona
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Map legend */}
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Leyenda del mapa</div>
                      <button
                        onClick={() => setColorMode(m => m === 'status' ? 'digital' : 'status')}
                        className={cn(
                          'text-xs font-medium px-2 py-1 rounded-lg transition-colors',
                          colorMode === 'digital'
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {colorMode === 'digital' ? '📡 Radar ON' : '📡 Radar'}
                      </button>
                    </div>
                    {colorMode === 'status' ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500 border border-orange-600"></span>
                          <span className="text-gray-600">Con sitio web</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600"></span>
                          <span className="text-gray-600">Con algún dato</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500 border border-red-600"></span>
                          <span className="text-gray-600">Sin datos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600"></span>
                          <span className="text-gray-600">Guardado como lead</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></span>
                          <span className="text-gray-600">Score digital ≥ 50</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500 border border-orange-600"></span>
                          <span className="text-gray-600">Score digital 1-49</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500 border border-red-600"></span>
                          <span className="text-gray-600">Score 0 / sin auditar</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Market Scanner */}
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-medium text-gray-700">Market Scanner</div>
                    <p className="text-xs text-gray-500">Audita todos los leads con web de esta zona para detectar oportunidades</p>
                    <Button
                      size="sm"
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={handleMarketScan}
                      disabled={isScanning || leadsWithCoords.filter(l => l.website).length === 0}
                    >
                      {isScanning ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Escaneando...
                        </span>
                      ) : (
                        `📡 Escanear zona (${leadsWithCoords.filter(l => l.website).length} con web)`
                      )}
                    </Button>
                    {marketScanResult && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs space-y-1">
                        <div className="font-medium text-orange-800">Resultado del escaneo</div>
                        <div className="text-gray-700">Auditados: <strong>{marketScanResult.totalAudited}</strong></div>
                        <div className="text-gray-700">Score promedio: <strong>{marketScanResult.avgScore}/100</strong></div>
                        {Object.entries(marketScanResult.byType).length > 0 && (
                          <div className="space-y-0.5 mt-1 pt-1 border-t border-orange-200">
                            {Object.entries(marketScanResult.byType).map(([type, count]) => (
                              <div key={type} className="flex justify-between text-gray-600">
                                <span>{OPPORTUNITY_TYPE_LABELS[type as keyof typeof OPPORTUNITY_TYPE_LABELS]?.label || type}</span>
                                <span className="font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setColorMode('digital')}
                          className="text-orange-700 hover:text-orange-900 font-medium mt-1 underline"
                        >
                          Ver en modo Radar →
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Search results */}
                {prospectResults.length > 0 && (
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Resultados ({prospectResults.length})
                        </span>
                        <button onClick={() => setProspectResults([])} className="text-xs text-gray-400 hover:text-gray-600">
                          Limpiar
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {prospectResults.map((p) => {
                          const alreadySaved = leads.some(l => l.osmId === p.osmId);
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedProspect(p)}
                              className={cn(
                                'p-2 rounded-lg border cursor-pointer transition-colors text-sm',
                                selectedProspect?.id === p.id
                                  ? 'border-blue-400 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', p.website ? 'bg-orange-500' : (p.phone || p.email) ? 'bg-yellow-500' : 'bg-red-500')} />
                                <span className="font-medium text-gray-900 truncate">{p.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 truncate mt-0.5">{p.businessType}</div>
                              {p.address && <div className="text-xs text-gray-400 truncate mt-0.5">{p.address}</div>}
                              {/* Contact info inline */}
                              <div className="flex items-center gap-3 mt-1 text-xs">
                                {p.phone && <span className="text-gray-500">📞 {p.phone}</span>}
                                {p.email && <span className="text-gray-500">✉️</span>}
                                {p.website && <span className="text-yellow-600">🌐</span>}
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                <div className="flex items-center gap-2">
                                  {p.distance != null && <span className="text-xs text-gray-400">{p.distance.toFixed(1)} km</span>}
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery(p.name))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-gray-400 hover:text-blue-600"
                                    title="Buscar en Google"
                                  >
                                    🔍
                                  </a>
                                </div>
                                {alreadySaved ? (
                                  <span className="text-xs text-green-600 font-medium">✓ Guardado</span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveFromProspect(p); }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    + Guardar lead
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Crear Grupo button + active group indicator */}
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Grupos de prospección</span>
                      <button
                        onClick={() => { setNewGroupTitle(selectedPreset ? (BUSINESS_PRESETS[selectedPreset]?.label || '') : ''); setIsGroupModalOpen(true); }}
                        className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        + Crear Grupo
                      </button>
                    </div>
                    {activeGroupId && (
                      <div className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-200 px-2 py-1.5 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-purple-700 font-medium truncate">
                          Guardando en: {prospectGroups.find(g => g.id === activeGroupId)?.title}
                        </span>
                        <button
                          onClick={() => setActiveGroupId(null)}
                          className="ml-auto text-purple-400 hover:text-purple-600"
                          title="Dejar de guardar en grupo"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {prospectGroups.length === 0 && !activeGroupId && (
                      <p className="text-xs text-gray-400">Crea un grupo para agrupar negocios por tipo</p>
                    )}
                  </CardContent>
                </Card>

                {/* Prospect groups display */}
                {prospectGroups.map((group) => (
                  <Card key={group.id} className={cn(
                    activeGroupId === group.id && 'ring-2 ring-purple-400'
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{group.title}</span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">{group.prospects.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {group.prospects.length > 0 && (
                            <button
                              onClick={() => handleCopyGroupNames(group.id)}
                              className="text-xs text-gray-500 hover:text-purple-600 px-1.5 py-0.5 border rounded hover:border-purple-300 transition-colors"
                              title="Copiar todos los nombres"
                            >
                              📋 Copiar nombres
                            </button>
                          )}
                          {activeGroupId !== group.id ? (
                            <button
                              onClick={() => setActiveGroupId(group.id)}
                              className="text-xs text-purple-600 hover:text-purple-800 px-1.5 py-0.5"
                              title="Activar este grupo"
                            >
                              ◎
                            </button>
                          ) : (
                            <span className="text-xs text-purple-600 px-1.5 py-0.5" title="Grupo activo">●</span>
                          )}
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-xs text-gray-400 hover:text-red-500 px-1 py-0.5"
                            title="Eliminar grupo"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                      {group.prospects.length > 0 ? (
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                          {group.prospects.map((p, idx) => (
                            <div key={p.id + '-' + idx} className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                              <span className="truncate text-gray-700">{p.name}</span>
                              {p.phone && <span className="text-gray-400 ml-auto flex-shrink-0">📞</span>}
                              {p.website && <span className="text-yellow-500 flex-shrink-0">🌐</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Guarda leads para agregarlos aquí</p>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Existing leads on map */}
                {leadsWithCoords.length > 0 && (
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Mis leads ({leadsWithCoords.length})
                      </div>
                      <div className="space-y-1 max-h-[250px] overflow-y-auto">
                        {leadsWithCoords.map((l) => (
                          <div
                            key={l.id}
                            onClick={() => setDetailLead(l)}
                            className={cn(
                              'p-2 rounded-lg cursor-pointer hover:bg-gray-50 text-sm border border-transparent transition-colors',
                              detailLead?.id === l.id ? 'bg-blue-50 border-blue-200' : ''
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                l.status === 'not_contacted' && 'bg-gray-400',
                                l.status === 'contacted' && 'bg-blue-400',
                                l.status === 'waiting_response' && 'bg-yellow-400',
                                l.status === 'responded' && 'bg-green-400',
                                l.status === 'not_interested' && 'bg-red-400',
                              )} />
                              <span className="truncate text-gray-700 font-medium">{l.companyName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 ml-4 text-xs">
                              {l.contactPhone ? (
                                <a href={`tel:${l.contactPhone}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-blue-600" title={l.contactPhone}>📞</a>
                              ) : (
                                <span className="text-gray-300" title="Sin teléfono">📞</span>
                              )}
                              {l.contactEmail ? (
                                <a href={`mailto:${l.contactEmail}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-blue-600" title={l.contactEmail}>✉️</a>
                              ) : (
                                <span className="text-gray-300" title="Sin email">✉️</span>
                              )}
                              {l.website ? (
                                <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-yellow-600 hover:text-yellow-700" title={l.website}>🌐</a>
                              ) : (
                                <span className="text-gray-300" title="Sin web">🌐</span>
                              )}
                              <span className={cn('text-xs ml-auto',
                                l.prospectScore < 30 && 'text-red-500',
                                l.prospectScore >= 30 && l.prospectScore < 60 && 'text-yellow-500',
                                l.prospectScore >= 60 && 'text-green-500',
                              )}>
                                {l.prospectScore}pts
                              </span>
                              {l.digitalScore !== undefined && l.digitalScore > 0 && (
                                <span className={cn('text-xs font-medium',
                                  l.digitalScore < 50 ? 'text-orange-600' : 'text-green-600',
                                )}>
                                  📡{l.digitalScore}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Map */}
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
                <ProspectingMap
                  center={mapCenter}
                  zoom={mapZoom}
                  prospects={prospectResults}
                  leads={leadsWithCoords}
                  selectedProspect={selectedProspect}
                  onSelectProspect={setSelectedProspect}
                  onSelectLead={setDetailLead}
                  onMapMove={(center) => setMapCenter(center)}
                  onSaveProspect={handleSaveFromProspect}
                  searchRadius={searchRadius}
                  onAuditLead={handleAuditLead}
                  colorMode={colorMode}
                />
              </div>

              {/* Right panel — lead detail */}
              {detailLead && (
                <div className="w-80 flex-shrink-0 overflow-y-auto">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{detailLead.companyName}</h3>
                          {detailLead.businessType && (
                            <p className="text-xs text-gray-500 mt-0.5">{detailLead.businessType}</p>
                          )}
                        </div>
                        <button onClick={() => setDetailLead(null)} className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        LEAD_STATUS_LABELS[detailLead.status].bg,
                        LEAD_STATUS_LABELS[detailLead.status].color,
                      )}>
                        {LEAD_STATUS_LABELS[detailLead.status].label}
                      </div>

                      {/* Score */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Score de prospección</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={cn('h-2 rounded-full',
                                detailLead.prospectScore < 30 && 'bg-red-500',
                                detailLead.prospectScore >= 30 && detailLead.prospectScore < 60 && 'bg-yellow-500',
                                detailLead.prospectScore >= 60 && 'bg-green-500',
                              )}
                              style={{ width: `${detailLead.prospectScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{detailLead.prospectScore}</span>
                        </div>
                      </div>

                      {/* Digital Audit */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Presencia digital</div>
                        {detailLead.digitalScore !== undefined && detailLead.digitalScore > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={cn('h-2 rounded-full',
                                    detailLead.digitalScore < 30 && 'bg-red-500',
                                    detailLead.digitalScore >= 30 && detailLead.digitalScore < 50 && 'bg-orange-500',
                                    detailLead.digitalScore >= 50 && 'bg-green-500',
                                  )}
                                  style={{ width: `${detailLead.digitalScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{detailLead.digitalScore}/100</span>
                            </div>
                            {detailLead.opportunityType && (
                              <div className={cn(
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                detailLead.digitalScore >= 50
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              )}>
                                {OPPORTUNITY_TYPE_LABELS[detailLead.opportunityType as keyof typeof OPPORTUNITY_TYPE_LABELS]?.label || detailLead.opportunityType.replace(/_/g, ' ')}
                              </div>
                            )}
                            {detailLead.lastAuditAt && (
                              <div className="text-xs text-gray-400">
                                Auditado: {formatDate(detailLead.lastAuditAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">Sin auditar</div>
                        )}
                        <div className="flex gap-2 mt-2">
                          {detailLead.website && (
                            <button
                              onClick={() => handleAuditLead(detailLead.id)}
                              disabled={isAuditing}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200 disabled:opacity-50"
                            >
                              {isAuditing ? '⏳ Auditando...' : '📡 Auditar digital'}
                            </button>
                          )}
                          {detailLead.digitalScore !== undefined && detailLead.digitalScore > 0 && (
                            <button
                              onClick={() => handleGenerateProposal(detailLead.id)}
                              disabled={isGeneratingProposal}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 disabled:opacity-50"
                            >
                              {isGeneratingProposal ? '⏳ Generando...' : '📄 Propuesta AI'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Data completeness */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Datos del lead</div>
                        <div className="grid grid-cols-4 gap-1">
                          <div className={cn('text-center p-1 rounded text-xs',
                            detailLead.contactEmail ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'
                          )}>
                            {detailLead.contactEmail ? '✓' : '✗'} Email
                          </div>
                          <div className={cn('text-center p-1 rounded text-xs',
                            detailLead.contactPhone ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'
                          )}>
                            {detailLead.contactPhone ? '✓' : '✗'} Tel.
                          </div>
                          <div className={cn('text-center p-1 rounded text-xs',
                            detailLead.website ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'
                          )}>
                            {detailLead.website ? '✓' : '✗'} Web
                          </div>
                          <div className={cn('text-center p-1 rounded text-xs',
                            detailLead.contactName ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'
                          )}>
                            {detailLead.contactName ? '✓' : '✗'} Nombre
                          </div>
                        </div>
                      </div>

                      {/* Contact info */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</div>
                        {detailLead.contactName && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {detailLead.contactName}
                          </div>
                        )}
                        {detailLead.contactEmail ? (
                          <a href={`mailto:${detailLead.contactEmail}`} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {detailLead.contactEmail}
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Sin email — buscá en Google
                          </div>
                        )}
                        {detailLead.contactPhone ? (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {detailLead.contactPhone}
                            <a
                              href={`https://wa.me/${detailLead.contactPhone.replace(/[^\d+]/g, '').replace(/^\+/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 ml-1"
                              title="Abrir WhatsApp"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.685-1.323A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.326-.658-6.085-1.79l-.427-.271-2.796.79.73-2.882-.28-.44A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Sin teléfono
                          </div>
                        )}
                        {detailLead.website ? (
                          <a href={detailLead.website.startsWith('http') ? detailLead.website : `https://${detailLead.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            {detailLead.website}
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            Sin web
                          </div>
                        )}
                        {detailLead.address && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {detailLead.address}
                          </div>
                        )}
                      </div>

                      {/* Google search buttons */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Buscar info</div>
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery(detailLead.companyName))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                          >
                            🔍 Buscar en Google
                          </a>
                          <a
                            href={`https://www.google.com/maps/search/${encodeURIComponent(detailLead.companyName + (searchCity ? ', ' + searchCity : detailLead.address ? ', ' + detailLead.address : ''))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                          >
                            📍 Google Maps
                          </a>
                          {detailLead.website && (
                            <a
                              href={detailLead.website.startsWith('http') ? detailLead.website : `https://${detailLead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 col-span-2"
                            >
                              🌐 Visitar sitio web
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      {detailLead.notes && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notas</div>
                          <p className="text-sm text-gray-600">{detailLead.notes}</p>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Fuente: {LEAD_SOURCE_LABELS[detailLead.source]}</div>
                        <div>Intentos de contacto: {detailLead.contactAttempts}</div>
                        <div>Creado: {formatDate(detailLead.createdAt)}</div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditModal(detailLead)}>
                            Editar
                          </Button>
                          <select
                            value={detailLead.status}
                            onChange={(e) => {
                              updateLead(detailLead.id, { status: e.target.value as LeadStatus });
                              setDetailLead({ ...detailLead, status: e.target.value as LeadStatus });
                            }}
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                          >
                            {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Convert — available for contacted / waiting / responded leads */}
                        {!detailLead.convertedToOpportunityId && ['contacted', 'waiting_response', 'responded'].includes(detailLead.status) && (
                          <Button
                            onClick={() => handleConvert(detailLead.id)}
                            disabled={isConverting}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {isConverting ? 'Convirtiendo...' : '→ Convertir a Oportunidad'}
                          </Button>
                        )}
                        {detailLead.convertedToOpportunityId && (
                          <div className="text-xs text-green-600 font-medium text-center py-1">
                            ✓ Convertido a oportunidad
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('¿Eliminar este lead?')) {
                              deleteLead(detailLead.id);
                              setDetailLead(null);
                            }
                          }}
                        >
                          Eliminar lead
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW */
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <SearchInput
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar leads..."
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las fuentes</option>
                  {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Bulk action bar */}
              {selectedLeadIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedLeadIds.size} lead{selectedLeadIds.size > 1 ? 's' : ''} seleccionado{selectedLeadIds.size > 1 ? 's' : ''}
                    <span className="text-blue-600 ml-1">
                      ({selectedLeadsWithEmail.length} con email, {selectedLeadsWithPhone.length} con tel.)
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleOpenBulkEmail}
                      disabled={selectedLeadsWithEmail.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Enviar email masivo
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleOpenBulkWhatsApp}
                      disabled={selectedLeadsWithPhone.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        </svg>
                        WhatsApp masivo
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkConvertToOpportunity}
                      disabled={isConverting}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                    >
                      {isConverting ? 'Convirtiendo...' : '→ Convertir a Oportunidades'}
                    </Button>
                    <button onClick={() => setSelectedLeadIds(new Set())} className="text-xs text-gray-500 hover:text-gray-700 ml-2">
                      Deseleccionar
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              {isLoading ? (
                <Loading />
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No hay leads. Usa el mapa para prospectar o crea uno manualmente.</p>
                </div>
              ) : (
                <div className="bg-white border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="text-left px-3 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="text-left px-3 py-3">Empresa</th>
                        <th className="text-left px-3 py-3">Contacto</th>
                        <th className="text-left px-3 py-3">Email / Tel.</th>
                        <th className="text-left px-3 py-3">Web</th>
                        <th className="text-left px-3 py-3">Estado</th>
                        <th className="text-center px-3 py-3">Score</th>
                        <th className="text-right px-3 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className={cn(
                          'hover:bg-gray-50 transition-colors',
                          selectedLeadIds.has(lead.id) && 'bg-blue-50'
                        )}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900 text-sm">{lead.companyName}</div>
                            {lead.businessType && <div className="text-xs text-gray-500">{lead.businessType}</div>}
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm text-gray-700">{lead.contactName || '—'}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="space-y-0.5">
                              {lead.contactEmail ? (
                                <a href={`mailto:${lead.contactEmail}`} className="text-xs text-blue-600 hover:text-blue-800 block truncate max-w-[180px]">{lead.contactEmail}</a>
                              ) : (
                                <span className="text-xs text-amber-500">Sin email</span>
                              )}
                              {lead.contactPhone ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600">{lead.contactPhone}</span>
                                  <a href={`https://wa.me/${lead.contactPhone.replace(/[^\d+]/g, '').replace(/^\+/, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700" title="WhatsApp">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                                  </a>
                                </div>
                              ) : (
                                <span className="text-xs text-amber-500">Sin teléfono</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {lead.website ? (
                              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-[120px] block">
                                🌐 {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </a>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">—</span>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery(lead.companyName) + ' sitio web')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-400 hover:text-blue-600"
                                  title="Buscar web en Google"
                                >
                                  🔍
                                </a>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              LEAD_STATUS_LABELS[lead.status].bg,
                              LEAD_STATUS_LABELS[lead.status].color,
                            )}>
                              {LEAD_STATUS_LABELS[lead.status].label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn('text-sm font-medium',
                              lead.prospectScore < 30 && 'text-red-600',
                              lead.prospectScore >= 30 && lead.prospectScore < 60 && 'text-yellow-600',
                              lead.prospectScore >= 60 && 'text-green-600',
                            )}>
                              {lead.prospectScore}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery(lead.companyName))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                title="Buscar en Google"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </a>
                              <a
                                href={`https://www.google.com/maps/search/${encodeURIComponent(lead.companyName + (searchCity ? ', ' + searchCity : lead.address ? ', ' + lead.address : ''))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-green-600 rounded"
                                title="Ver en Google Maps"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </a>
                              <button
                                onClick={() => openEditModal(lead)}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => { if (confirm('¿Eliminar este lead?')) deleteLead(lead.id); }}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                title="Eliminar"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* CAMPAIGNS VIEW */
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Campañas de Email</h2>
                <p className="text-sm text-gray-500">Selecciona leads y envía emails masivos para convertirlos en oportunidades</p>
              </div>

              {/* Campaign workflow */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">1️⃣</div>
                    <div className="text-sm font-medium text-gray-900">Prospectar</div>
                    <div className="text-xs text-gray-500 mt-1">Busca negocios en el mapa y guárdalos como leads</div>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setViewMode('map')}>Ir al mapa</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">2️⃣</div>
                    <div className="text-sm font-medium text-gray-900">Seleccionar</div>
                    <div className="text-xs text-gray-500 mt-1">Ve a la lista, selecciona los leads que quieras contactar</div>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setViewMode('list')}>Ir a lista</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">3️⃣</div>
                    <div className="text-sm font-medium text-gray-900">Enviar email</div>
                    <div className="text-xs text-gray-500 mt-1">Envía un email masivo a los seleccionados con Resend</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">4️⃣</div>
                    <div className="text-sm font-medium text-gray-900">Convertir</div>
                    <div className="text-xs text-gray-500 mt-1">Los leads contactados se convierten en oportunidades</div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Leads sin contactar con email</div>
                        <div className="text-2xl font-bold text-indigo-600 mt-1">
                          {leads.filter(l => l.status === 'not_contacted' && l.contactEmail).length}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => {
                        const notContactedWithEmail = leads.filter(l => l.status === 'not_contacted' && l.contactEmail);
                        setSelectedLeadIds(new Set(notContactedWithEmail.map(l => l.id)));
                        setViewMode('list');
                      }}
                    >
                      Seleccionar todos y enviar
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Sin email (investigar)</div>
                        <div className="text-2xl font-bold text-amber-600 mt-1">
                          {leads.filter(l => !l.contactEmail).length}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">Buscá su info en Google o sitio web para agregar el email</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Listos para convertir</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                          {leads.filter(l => (l.status === 'contacted' || l.status === 'responded') && !l.convertedToOpportunityId).length}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const contactedLeads = leads.filter(l => (l.status === 'contacted' || l.status === 'responded') && !l.convertedToOpportunityId);
                        setSelectedLeadIds(new Set(contactedLeads.map(l => l.id)));
                        setViewMode('list');
                      }}
                    >
                      Seleccionar y convertir
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* WhatsApp templates */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Plantillas de WhatsApp</h3>
                  <p className="text-xs text-gray-500 mb-3">Se abre WhatsApp Web para cada lead — sin necesidad de API</p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setWaMessage('Hola {{nombre}}, soy de {{mi_empresa}} 👋\n\nVi que tienen {{empresa}} y me gustaría presentarles nuestros servicios que pueden ser de gran utilidad.\n\n¿Tendrían unos minutos para conversar?');
                        setWaOpenedIndexes(new Set());
                        setIsWhatsAppModalOpen(true);
                      }}
                      className="p-3 text-left border rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">💬 Primer contacto</div>
                      <div className="text-xs text-gray-500 mt-1">Presentación inicial por WhatsApp</div>
                    </button>
                    <button
                      onClick={() => {
                        setWaMessage('Hola {{nombre}} 👋\n\nTe escribo de {{mi_empresa}} para hacer seguimiento. ¿Pudieron evaluar nuestra propuesta?\n\nQuedo a las órdenes para cualquier consulta.');
                        setWaOpenedIndexes(new Set());
                        setIsWhatsAppModalOpen(true);
                      }}
                      className="p-3 text-left border rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">🔄 Follow-up</div>
                      <div className="text-xs text-gray-500 mt-1">Seguimiento por WhatsApp</div>
                    </button>
                    <button
                      onClick={() => {
                        setWaMessage('Hola {{nombre}} 👋\n\nDesde {{mi_empresa}} tenemos una promoción especial que pensamos puede interesarle a {{empresa}}.\n\n[Describir oferta]\n\n¿Les gustaría saber más?');
                        setWaOpenedIndexes(new Set());
                        setIsWhatsAppModalOpen(true);
                      }}
                      className="p-3 text-left border rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">🎯 Oferta especial</div>
                      <div className="text-xs text-gray-500 mt-1">Propuesta con oferta/descuento</div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Email templates */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Plantillas de email rápidas</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setEmailSubject('Presentación de nuestros servicios');
                        setEmailBody('Hola {{nombre}},\n\nSomos {{mi_empresa}} y nos gustaría presentarte nuestros servicios que pueden ser de gran utilidad para {{empresa}}.\n\n¿Tendrías unos minutos esta semana para una breve llamada?\n\nSaludos cordiales');
                        setIsEmailModalOpen(true);
                      }}
                      className="p-3 text-left border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">📧 Primer contacto</div>
                      <div className="text-xs text-gray-500 mt-1">Presentación inicial de servicios</div>
                    </button>
                    <button
                      onClick={() => {
                        setEmailSubject('Seguimiento - {{mi_empresa}}');
                        setEmailBody('Hola {{nombre}},\n\nTe escribo para hacer seguimiento a mi email anterior. Creo que nuestros servicios podrían beneficiar a {{empresa}}.\n\n¿Te gustaría agendar una reunión breve?\n\nQuedo a disposición.\nSaludos');
                        setIsEmailModalOpen(true);
                      }}
                      className="p-3 text-left border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">🔄 Follow-up</div>
                      <div className="text-xs text-gray-500 mt-1">Seguimiento después de primer contacto</div>
                    </button>
                    <button
                      onClick={() => {
                        setEmailSubject('Oferta especial para {{empresa}}');
                        setEmailBody('Hola {{nombre}},\n\nTenemos una oferta especial que pensamos puede interesarte para {{empresa}}.\n\n[Describir oferta aquí]\n\n¿Te gustaría saber más?\n\nSaludos cordiales');
                        setIsEmailModalOpen(true);
                      }}
                      className="p-3 text-left border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">🎯 Oferta especial</div>
                      <div className="text-xs text-gray-500 mt-1">Propuesta con oferta/descuento</div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Lead Form Modal */}
      <Modal
        isOpen={isLeadModalOpen}
        onClose={() => { setIsLeadModalOpen(false); setEditingLead(null); }}
        title={editingLead ? 'Editar Lead' : 'Nuevo Lead'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre de empresa *"
              value={formData.companyName}
              onChange={(e) => setFormData(f => ({ ...f, companyName: e.target.value }))}
              placeholder="Nombre del negocio"
            />
            <Input
              label="Tipo de negocio"
              value={formData.businessType}
              onChange={(e) => setFormData(f => ({ ...f, businessType: e.target.value }))}
              placeholder="Ej: Restaurante, Tienda..."
            />
          </div>

          <Input
            label="Dirección"
            value={formData.address}
            onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
            placeholder="Dirección del negocio"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre de contacto"
              value={formData.contactName}
              onChange={(e) => setFormData(f => ({ ...f, contactName: e.target.value }))}
              placeholder="Nombre y apellido"
            />
            <Input
              label="Email de contacto"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData(f => ({ ...f, contactEmail: e.target.value }))}
              placeholder="email@ejemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={formData.contactPhone}
              onChange={(e) => setFormData(f => ({ ...f, contactPhone: e.target.value }))}
              placeholder="+598 99 123 456"
            />
            <Input
              label="Sitio web"
              value={formData.website}
              onChange={(e) => setFormData(f => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData(f => ({ ...f, source: e.target.value as LeadSource }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(LEAD_SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canal preferido</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData(f => ({ ...f, channel: e.target.value as ContactChannel }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin especificar</option>
                {CHANNEL_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Score de prospección: {formData.prospectScore}
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={formData.prospectScore}
              onChange={(e) => setFormData(f => ({ ...f, prospectScore: parseInt(e.target.value) }))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Frío</span>
              <span>Tibio</span>
              <span>Caliente</span>
            </div>
          </div>

          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notas sobre este lead..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setIsLeadModalOpen(false); setEditingLead(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitLead} disabled={!formData.companyName.trim()}>
              {editingLead ? 'Guardar cambios' : 'Crear lead'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => { setIsEmailModalOpen(false); setEmailSendResult(null); }}
        title="Enviar email masivo"
        size="lg"
      >
        <div className="space-y-4">
          {emailSendResult ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-4">{emailSendResult.sent > 0 ? '✅' : '❌'}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaña enviada</h3>
              <div className="space-y-2 text-sm">
                <div className="text-green-600">✓ {emailSendResult.sent} emails enviados correctamente</div>
                {emailSendResult.failed > 0 && <div className="text-red-600">✗ {emailSendResult.failed} emails fallaron</div>}
                {emailSendResult.noEmail > 0 && <div className="text-amber-600">⚠ {emailSendResult.noEmail} leads sin email (omitidos)</div>}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Los leads contactados cambiaron su estado a &quot;Contactado&quot;.
                Ahora pueden convertirse en oportunidades.
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <Button variant="outline" onClick={() => { setIsEmailModalOpen(false); setEmailSendResult(null); setSelectedLeadIds(new Set()); }}>
                  Cerrar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    setEmailSendResult(null);
                    handleBulkConvertToOpportunity();
                  }}
                >
                  Convertir a Oportunidades
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Destinatarios</div>
                <div className="text-sm text-gray-700">
                  {selectedLeadsWithEmail.length} lead{selectedLeadsWithEmail.length !== 1 ? 's' : ''} con email
                  {selectedLeadIds.size - selectedLeadsWithEmail.length > 0 && (
                    <span className="text-amber-500 ml-2">
                      ({selectedLeadIds.size - selectedLeadsWithEmail.length} sin email serán omitidos)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                  {selectedLeadsWithEmail.map(l => (
                    <span key={l.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                      {l.companyName}
                    </span>
                  ))}
                </div>
              </div>

              <Input
                label="Asunto"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Asunto del email..."
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                  <span className="text-xs text-gray-400 ml-2">
                    Variables: {'{{nombre}}'} {'{{empresa}}'} {'{{mi_empresa}}'}
                  </span>
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe tu email aquí..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsEmailModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendBulkEmails}
                  disabled={isSendingEmails || !emailSubject.trim() || !emailBody.trim() || selectedLeadsWithEmail.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSendingEmails ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    `Enviar a ${selectedLeadsWithEmail.length} lead${selectedLeadsWithEmail.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Bulk WhatsApp Modal */}
      <Modal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        title="Enviar WhatsApp masivo"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.685-1.323A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.326-.658-6.085-1.79l-.427-.271-2.796.79.73-2.882-.28-.44A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
              </svg>
              <span className="text-sm font-medium text-green-800">Sin API — se abre WhatsApp Web para cada lead</span>
            </div>
            <p className="text-xs text-green-700">Escribí el mensaje una vez y hacé click en cada lead para abrir WhatsApp con el mensaje personalizado. Después de enviar, marcá como enviado.</p>
          </div>

          <div className="bg-gray-50 border rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Leads con teléfono</div>
            <div className="text-sm text-gray-700">
              {selectedLeadsWithPhone.length} lead{selectedLeadsWithPhone.length !== 1 ? 's' : ''} con teléfono
              {selectedLeadIds.size - selectedLeadsWithPhone.length > 0 && (
                <span className="text-amber-500 ml-2">
                  ({selectedLeadIds.size - selectedLeadsWithPhone.length} sin teléfono serán omitidos)
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje de WhatsApp
              <span className="text-xs text-gray-400 ml-2">
                Variables: {'{{nombre}}'} {'{{empresa}}'} {'{{mi_empresa}}'}
              </span>
            </label>
            <textarea
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
              placeholder="Hola {{nombre}}, soy de {{mi_empresa}}..."
            />
          </div>

          {waMessage.trim() && selectedLeadsWithPhone.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Enviar a cada lead</span>
                <span className="text-xs text-gray-500">
                  {waOpenedIndexes.size} / {selectedLeadsWithPhone.length} enviados
                </span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedLeadsWithPhone.map((lead, idx) => {
                  const opened = waOpenedIndexes.has(idx);
                  const waLink = buildWaLink(lead.contactPhone!, waMessage, lead);
                  return (
                    <div key={lead.id} className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      opened ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    )}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {opened && <span className="text-green-600">✓</span>}
                          <span className="text-sm font-medium text-gray-900 truncate">{lead.companyName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {lead.contactName && <span>{lead.contactName} · </span>}
                          {lead.contactPhone}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleMarkWaSent(idx, lead)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                            opened
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          )}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          </svg>
                          {opened ? 'Abrir de nuevo' : 'Enviar'}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {waOpenedIndexes.size > 0 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-green-600">{waOpenedIndexes.size}</span> WhatsApps abiertos
                  </div>
                  <Button
                    size="sm"
                    onClick={() => { setIsWhatsAppModalOpen(false); setSelectedLeadIds(new Set()); }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Listo
                  </Button>
                </div>
              )}
            </div>
          )}

          {!waMessage.trim() && (
            <div className="text-center py-4 text-sm text-gray-500">
              Escribí un mensaje arriba para ver la lista de leads
            </div>
          )}
        </div>
      </Modal>

      {/* Group Creation Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => { setIsGroupModalOpen(false); setNewGroupTitle(''); }}
        title="Crear grupo de prospección"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Los negocios que guardes como lead se agregarán automáticamente a este grupo.
          </p>
          <Input
            label="Nombre del grupo"
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="Ej: Restaurantes, Peluquerías..."
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setIsGroupModalOpen(false); setNewGroupTitle(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleCreateGroup(newGroupTitle)}
              disabled={!newGroupTitle.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Crear grupo
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
