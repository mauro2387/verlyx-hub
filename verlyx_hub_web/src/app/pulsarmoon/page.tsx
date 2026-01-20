'use client';

import { useState, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout';
import { Button, Card, CardContent, Input, Select, Modal, Badge, Textarea, SearchInput, ConfirmDialog, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore, useCompanyStore } from '@/lib/store';

interface AgencyProject {
  id: string;
  name: string;
  clientName: string;
  type: 'web' | 'mobile' | 'design' | 'marketing' | 'consulting' | 'ecommerce';
  status: 'discovery' | 'design' | 'development' | 'testing' | 'launch' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget: number;
  spent: number;
  currency: string;
  startDate: string;
  deadline: string;
  progress: number;
  teamMembers: string[];
  description: string;
  technologies?: string[];
}

// Demo projects for demo mode
const demoProjects: AgencyProject[] = [
  {
    id: 'demo-1',
    name: 'E-commerce Premium',
    clientName: 'Fashion Store',
    type: 'ecommerce',
    status: 'development',
    priority: 'high',
    budget: 50000,
    spent: 32000,
    currency: 'USD',
    startDate: '2025-01-01',
    deadline: '2025-03-31',
    progress: 65,
    teamMembers: ['Ana García', 'Carlos López', 'María Rodríguez'],
    description: 'Desarrollo de plataforma e-commerce con diseño premium y pasarela de pagos.',
    technologies: ['Next.js', 'Stripe', 'PostgreSQL', 'Tailwind'],
  },
  {
    id: 'demo-2',
    name: 'App Delivery',
    clientName: 'QuickFood',
    type: 'mobile',
    status: 'design',
    priority: 'critical',
    budget: 80000,
    spent: 15000,
    currency: 'USD',
    startDate: '2025-01-10',
    deadline: '2025-05-15',
    progress: 25,
    teamMembers: ['Pedro Martínez', 'Laura Sánchez', 'Juan Pérez', 'Ana García'],
    description: 'Aplicación móvil de delivery con seguimiento en tiempo real.',
    technologies: ['Flutter', 'Firebase', 'Google Maps', 'Node.js'],
  },
  {
    id: 'demo-3',
    name: 'Rediseño Corporativo',
    clientName: 'Banco Nacional',
    type: 'design',
    status: 'discovery',
    priority: 'medium',
    budget: 25000,
    spent: 3000,
    currency: 'USD',
    startDate: '2025-01-15',
    deadline: '2025-02-28',
    progress: 15,
    teamMembers: ['María Rodríguez', 'Diego Fernández'],
    description: 'Rediseño completo de identidad visual y sitio web corporativo.',
    technologies: ['Figma', 'Webflow', 'Lottie'],
  },
];

const statusConfig = {
  discovery: { label: 'Descubrimiento', color: 'bg-purple-100 text-purple-700', icon: '🔍' },
  design: { label: 'Diseño', color: 'bg-pink-100 text-pink-700', icon: '🎨' },
  development: { label: 'Desarrollo', color: 'bg-blue-100 text-blue-700', icon: '💻' },
  testing: { label: 'Testing', color: 'bg-yellow-100 text-yellow-700', icon: '🧪' },
  launch: { label: 'Lanzamiento', color: 'bg-green-100 text-green-700', icon: '🚀' },
  maintenance: { label: 'Mantenimiento', color: 'bg-gray-100 text-gray-700', icon: '🔧' },
};

const typeConfig = {
  web: { label: 'Desarrollo Web', icon: '🌐' },
  mobile: { label: 'App Móvil', icon: '📱' },
  design: { label: 'Diseño', icon: '🎨' },
  marketing: { label: 'Marketing', icon: '📈' },
  consulting: { label: 'Consultoría', icon: '💼' },
  ecommerce: { label: 'E-commerce', icon: '🛒' },
};

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Media', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  critical: { label: 'Crítica', color: 'bg-red-100 text-red-600' },
};

export default function PulsarMoonPage() {
  const { user } = useAuthStore();
  const { selectedCompanyId } = useCompanyStore();
  const isDemoMode = user?.id?.startsWith('demo') || false;
  
  const [projects, setProjects] = useState<AgencyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'pipeline' | 'list'>('cards');
  const [filterType, setFilterType] = useState<string>('all');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AgencyProject | null>(null);

  // Load projects from Supabase or demo data
  useEffect(() => {
    loadProjects();
  }, [isDemoMode, selectedCompanyId]);

  const loadProjects = async () => {
    if (isDemoMode) {
      setProjects(demoProjects);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('business_unit', 'pulsarmoon')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database format to component format
      const mappedProjects = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        clientName: p.client_name || '',
        type: p.project_type || 'web',
        status: p.status || 'discovery',
        priority: p.priority || 'medium',
        budget: p.budget || 0,
        spent: p.spent || 0,
        currency: p.currency || 'USD',
        startDate: p.start_date,
        deadline: p.deadline,
        progress: p.progress || 0,
        teamMembers: p.team_members || [],
        description: p.description || '',
        technologies: p.technologies || [],
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;

  const filteredProjects = filterType === 'all'
    ? projects
    : projects.filter(p => p.type === filterType);

  const statuses = ['discovery', 'design', 'development', 'testing', 'launch', 'maintenance'] as const;

  return (
    <MainLayout>
      <PageHeader
        title="PulsarMoon Agency"
        description="Gestión de proyectos de agencia digital"
        actions={
          !isDemoMode && (
            <Button onClick={() => setIsProjectModalOpen(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Proyecto
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm">Proyectos Activos</p>
              <p className="text-3xl font-bold">{projects.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🚀</div>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-gray-500 text-sm">Presupuesto Total</p>
          <p className="text-3xl font-bold text-gray-900">${totalBudget.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">En {projects.length} proyectos</p>
        </Card>
        <Card className="p-6">
          <p className="text-gray-500 text-sm">Ejecutado</p>
          <p className="text-3xl font-bold text-indigo-600">${totalSpent.toLocaleString()}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(totalSpent / totalBudget) * 100}%` }} />
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-gray-500 text-sm">Progreso Promedio</p>
          <p className="text-3xl font-bold text-green-600">{avgProgress}%</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {isDemoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <span>👁️</span>
              <span className="font-medium">Modo Demo</span>
            </div>
          )}
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'all', label: 'Todos los tipos' },
              { value: 'web', label: '🌐 Desarrollo Web' },
              { value: 'mobile', label: '📱 App Móvil' },
              { value: 'design', label: '🎨 Diseño' },
              { value: 'marketing', label: '📈 Marketing' },
              { value: 'ecommerce', label: '🛒 E-commerce' },
              { value: 'consulting', label: '💼 Consultoría' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'cards' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
          >
            Tarjetas
          </button>
          <button
            onClick={() => setViewMode('pipeline')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'pipeline' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
          >
            Lista
          </button>
        </div>
      </div>

      {/* Cards View */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No hay proyectos"
          description={isDemoMode ? "No hay proyectos de demostración disponibles" : "Comienza creando tu primer proyecto"}
        />
      ) : viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedProject(project)}>
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                      {typeConfig[project.type].icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.clientName}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[project.priority].color}`}>
                    {priorityConfig[project.priority].label}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Progreso</span>
                    <span className="font-medium text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-500">Presupuesto</span>
                  <span className="font-medium text-gray-900">
                    ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
                  </span>
                </div>

                {/* Technologies */}
                {project.technologies && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {project.technologies.slice(0, 3).map(tech => (
                      <span key={tech} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{project.technologies.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[project.status].color}`}>
                    {statusConfig[project.status].icon} {statusConfig[project.status].label}
                  </span>
                  <div className="flex -space-x-2">
                    {project.teamMembers.slice(0, 3).map((member, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                        title={member}
                      >
                        {member.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                    {project.teamMembers.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                        +{project.teamMembers.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map(status => {
            const statusProjects = filteredProjects.filter(p => p.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-80">
                <div className={`p-3 rounded-t-lg ${statusConfig[status].color}`}>
                  <div className="flex items-center gap-2">
                    <span>{statusConfig[status].icon}</span>
                    <span className="font-medium">{statusConfig[status].label}</span>
                    <span className="ml-auto bg-white/50 px-2 py-0.5 rounded-full text-sm">
                      {statusProjects.length}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[400px]">
                  {statusProjects.map(project => (
                    <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedProject(project)}>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{typeConfig[project.type].icon}</span>
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                            <p className="text-xs text-gray-500">{project.clientName}</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full mb-2">
                          <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{project.progress}%</span>
                          <span>{new Date(project.deadline).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proyecto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progreso</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Presupuesto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map(project => (
                  <tr key={project.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedProject(project)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{typeConfig[project.type].icon}</span>
                        <span className="font-medium text-gray-900">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeConfig[project.type].label}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[project.status].color}`}>
                        {statusConfig[project.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-sm text-gray-600">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(project.deadline).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-2">
                        {project.teamMembers.slice(0, 3).map((member, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full bg-violet-500 border-2 border-white flex items-center justify-center text-white text-xs"
                            title={member}
                          >
                            {member[0]}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <Modal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={selectedProject.name}>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl">
                {typeConfig[selectedProject.type].icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedProject.name}</h3>
                <p className="text-gray-500">{selectedProject.clientName}</p>
              </div>
            </div>

            <p className="text-gray-600">{selectedProject.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`inline-flex mt-1 text-sm px-2 py-1 rounded-full ${statusConfig[selectedProject.status].color}`}>
                  {statusConfig[selectedProject.status].icon} {statusConfig[selectedProject.status].label}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Prioridad</p>
                <span className={`inline-flex mt-1 text-sm px-2 py-1 rounded-full ${priorityConfig[selectedProject.priority].color}`}>
                  {priorityConfig[selectedProject.priority].label}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Presupuesto</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  ${selectedProject.spent.toLocaleString()} / ${selectedProject.budget.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Deadline</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {new Date(selectedProject.deadline).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Progreso</p>
              <div className="h-3 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                  style={{ width: `${selectedProject.progress}%` }}
                />
              </div>
              <p className="text-right text-sm text-gray-600 mt-1">{selectedProject.progress}%</p>
            </div>

            {selectedProject.technologies && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Tecnologías</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.technologies.map(tech => (
                    <span key={tech} className="px-3 py-1 bg-violet-100 text-violet-700 text-sm rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 mb-2">Equipo</p>
              <div className="flex flex-wrap gap-2">
                {selectedProject.teamMembers.map(member => (
                  <div key={member} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-medium">
                      {member.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm text-gray-700">{member}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedProject(null)}>Cerrar</Button>
              <Button>Editar Proyecto</Button>
            </div>
          </div>
        </Modal>
      )}
    </MainLayout>
  );
}
