// Types - Modelos de datos basados en Flutter

// Enums/Types para estados
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED' | 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type DealStage = 'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST' | 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL' | 'low' | 'medium' | 'high' | 'critical';

export interface Client {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  companyName?: string;
  position?: string;
  type: 'client' | 'partner' | 'supplier' | 'merchant' | 'individual' | 'company' | 'lead' | null;
  description?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  status?: string;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  myCompanyId?: string | null;
  clientCompanyId?: string | null;
  name: string;
  description?: string | null;
  status: 'backlog' | 'planning' | 'in_progress' | 'on_hold' | 'review' | 'done' | 'cancelled' | 'active' | 'completed';
  priority: Priority;
  budget?: number | null;
  spent?: number | null;
  spentAmount?: number | null;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
  completionDate?: string | null;
  progress?: number;
  progressPercentage?: number;
  clientId?: string | null;
  dealId?: string | null;
  tags?: string[];
  teamMembers?: string[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  myCompanyId?: string | null;
  projectId?: string | null;
  dealId?: string | null;
  clientId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  assignedTo?: string | null;
  assigneeName?: string;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  progressPercentage?: number;
  isBlocked?: boolean;
  blockedReason?: string | null;
  tags?: string[];
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  text: string;
  completed: boolean;
  order: number;
}

export interface Deal {
  id: string;
  myCompanyId?: string;
  clientId?: string;
  organizationId?: string | null;
  title: string;
  name?: string;
  description?: string | null;
  stage: DealStage;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'low' | 'medium' | 'high' | 'critical';
  amount?: number | null;
  value?: number;
  currency?: string;
  probability?: number;
  expectedRevenue?: number | null;
  expectedCloseDate?: string | null;
  closeDate?: string | null;
  actualCloseDate?: string | null;
  lostReason?: string | null;
  wonReason?: string | null;
  source?: string | null;
  daysInStage?: number;
  nextAction?: string | null;
  nextActionDate?: string | null;
  clientName?: string;
  notes?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MyCompany {
  id: string;
  name: string;
  legalName?: string;
  type: string;
  description?: string | null;
  taxId?: string;
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  primaryColor: string;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  filePath: string;
  description?: string | null;
  folder?: string | null;
  mimeType?: string | null;
  size?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  fullName?: string;
  role?: 'owner' | 'admin' | 'staff' | 'readonly';
  avatar?: string;
  avatarUrl?: string;
}

// Stats
export interface DashboardStats {
  projectsTotal: number;
  projectsInProgress: number;
  tasksTotal: number;
  tasksPending: number;
  dealsTotal: number;
  dealsValue: number;
  clientsTotal: number;
}
