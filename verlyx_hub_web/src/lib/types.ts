// Types - Modelos de datos basados en Flutter

// Enums/Types para estados — canonical lowercase (matches DB CHECK constraints)
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled';
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'backlog' | 'planning' | 'in_progress' | 'on_hold' | 'review' | 'done' | 'cancelled';
export type ContactType = 'lead' | 'client' | 'partner' | 'supplier' | 'merchant';
export type ContactStatus = 'new' | 'contacted' | 'qualified' | 'negotiation' | 'won' | 'lost' | 'inactive';

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
  type: ContactType | null;
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
  status: ProjectStatus;
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
  priority?: Priority;
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
  tags?: string[] | null;
  isPublic?: boolean;
  projectId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
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

// ==========================================
// FINANCIAL SYSTEM TYPES
// ==========================================

export interface Category {
  id: string;
  myCompanyId: string;
  name: string;
  type: 'expense' | 'income';
  color?: string | null;
  icon?: string | null;
  parentId?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  myCompanyId: string;
  name: string;
  type: 'cash' | 'bank' | 'mercadopago' | 'stripe' | 'paypal' | 'other';
  currency: string;
  bankName?: string | null;
  accountNumber?: string | null;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  color?: string | null;
  icon?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  myCompanyId: string;
  description: string;
  amount: number;
  currency: string;
  categoryId?: string | null;
  category?: Category | null;
  supplierName?: string | null;
  supplierTaxId?: string | null;
  accountId?: string | null;
  account?: Account | null;
  paymentMethod?: string | null;
  paymentDate: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  projectId?: string | null;
  dealId?: string | null;
  attachmentUrls?: string[] | null;
  tags?: string[] | null;
  notes?: string | null;
  status: 'paid' | 'pending' | 'cancelled';
  isRecurring: boolean;
  recurringFrequency?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  myCompanyId: string;
  description: string;
  amount: number;
  currency: string;
  categoryId?: string | null;
  category?: Category | null;
  clientId?: string | null;
  clientName?: string | null;
  accountId?: string | null;
  account?: Account | null;
  paymentMethod?: string | null;
  paymentDate?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  projectId?: string | null;
  dealId?: string | null;
  paymentLinkId?: string | null;
  attachmentUrls?: string[] | null;
  tags?: string[] | null;
  notes?: string | null;
  status: 'pending' | 'received' | 'cancelled' | 'overdue';
  dueDate?: string | null;
  isRecurring: boolean;
  recurringFrequency?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  myCompanyId: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number | null;
  categoryId?: string | null;
  category?: Category | null;
  plannedAmount: number;
  currency: string;
  isActive: boolean;
  alertPercentage: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  myCompanyId: string;
  accountId: string;
  account?: Account | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description?: string | null;
  expenseId?: string | null;
  incomeId?: string | null;
  toAccountId?: string | null;
  balanceAfter?: number | null;
  transactionDate: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  pendingIncomes: number;
  pendingIncomesAmount: number;
  overdueIncomes: number;
  overdueIncomesAmount: number;
  totalBalance: number;
  monthlyData?: { month: number; income: number; expense: number; net: number }[];
}

// ==========================================
// CRM ADVANCED TYPES
// ==========================================

// Enum types for CRM
export type ContactActivityType = 
  | 'call' 
  | 'email' 
  | 'meeting' 
  | 'note' 
  | 'whatsapp' 
  | 'task' 
  | 'deal_created' 
  | 'deal_won' 
  | 'deal_lost' 
  | 'project_started' 
  | 'payment_received' 
  | 'document_sent' 
  | 'proposal_sent' 
  | 'follow_up' 
  | 'other';

export type CommunicationDirection = 'inbound' | 'outbound' | 'internal';
export type InteractionSentiment = 'positive' | 'neutral' | 'negative';
export type LeadTemperature = 'cold' | 'warm' | 'hot' | 'very_hot';
export type SegmentType = 'manual' | 'dynamic' | 'smart';
export type CommunicationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

// Contact Activity - Historial de interacciones con contactos
export interface ContactActivity {
  id: string;
  myCompanyId: string;
  contactId: string;
  createdBy?: string | null;
  assignedTo?: string | null;
  
  activityType: ContactActivityType;
  direction: CommunicationDirection;
  sentiment?: InteractionSentiment | null;
  
  subject?: string | null;
  description?: string | null;
  outcome?: string | null;
  
  activityDate: string;
  durationMinutes?: number | null;
  
  dealId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  
  followUpDate?: string | null;
  followUpNotes?: string | null;
  isFollowUpDone: boolean;
  
  attachments?: { name: string; url: string; type: string }[];
  metadata?: Record<string, unknown>;
  
  // Joined data
  contactName?: string;
  createdByName?: string;
  assignedToName?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Lead Score - Puntuación de leads
export interface ClientLeadScore {
  id: string;
  myCompanyId: string;
  contactId: string;
  
  totalScore: number;
  temperature: LeadTemperature;
  
  engagementScore: number;
  profileScore: number;
  behaviorScore: number;
  financialScore: number;
  
  lastActivityDate?: string | null;
  lastScoreUpdate?: string | null;
  decayRate: number;
  
  // Joined data
  clientName?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Lead Scoring Rule - Reglas de puntuación
export interface LeadScoringRule {
  id: string;
  myCompanyId: string;
  
  name: string;
  description?: string | null;
  
  triggerType: 'activity' | 'deal' | 'engagement' | 'profile';
  triggerCondition: Record<string, unknown>;
  
  points: number;
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// Lead Score History - Historial de cambios de score
export interface LeadScoreHistory {
  id: string;
  clientLeadScoreId: string;
  
  pointsChange: number;
  previousScore: number;
  newScore: number;
  
  reason: string;
  ruleId?: string | null;
  activityId?: string | null;
  
  createdAt: string;
}

// Client Segment - Segmentos de clientes
export interface ClientSegment {
  id: string;
  myCompanyId: string;
  
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  
  segmentType: SegmentType;
  conditions?: Record<string, unknown>;
  
  clientCount: number;
  
  isActive: boolean;
  createdBy?: string | null;
  
  createdAt: string;
  updatedAt: string;
}

// Contact Segment Member - Membresía en segmentos
export interface ContactSegmentMember {
  id: string;
  segmentId: string;
  contactId: string;
  
  addedAt: string;
  addedBy?: string | null;
  
  // Joined data
  contactName?: string;
  segmentName?: string;
}

// Scheduled Communication - Comunicaciones programadas
export interface ScheduledCommunication {
  id: string;
  myCompanyId: string;
  
  contactId?: string | null;
  segmentId?: string | null;
  
  communicationType: 'email' | 'whatsapp' | 'sms';
  subject?: string | null;
  content: string;
  templateId?: string | null;
  
  scheduledFor: string;
  timezone: string;
  
  status: CommunicationStatus;
  sentAt?: string | null;
  errorMessage?: string | null;
  
  metadata?: Record<string, unknown>;
  
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

// CRM Summary View - Vista resumida de cliente con CRM data
export interface ClientCRMSummary {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: string | null;
  isActive: boolean;
  myCompanyId: string;
  
  leadScore: number;
  temperature: LeadTemperature;
  engagementScore?: number | null;
  profileScore?: number | null;
  financialScore?: number | null;
  
  totalActivities: number;
  lastActivityDate?: string | null;
  lastActivityType?: ContactActivityType | null;
  
  dealsCount: number;
  totalRevenue: number;
  
  createdAt: string;
  updatedAt: string;
}

// Pending Follow-up View
export interface PendingFollowUp {
  id: string;
  myCompanyId: string;
  contactId: string;
  contactName: string;
  contactEmail?: string | null;
  
  subject?: string | null;
  activityType: ContactActivityType;
  activityDate: string;
  followUpDate: string;
  followUpNotes?: string | null;
  assignedTo?: string | null;
  
  urgency: 'overdue' | 'today' | 'this_week' | 'later';
}

// ==========================================
// COTIZACIONES/PRESUPUESTOS
// ==========================================

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface Quote {
  id: string;
  myCompanyId: string;
  contactId?: string | null;
  dealId?: string | null;
  
  quoteNumber: string;
  title: string;
  description?: string | null;
  
  status: QuoteStatus;
  issueDate: string;
  validUntil: string;
  sentAt?: string | null;
  viewedAt?: string | null;
  respondedAt?: string | null;
  
  currency: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  
  terms?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  
  viewCount: number;
  
  contactName?: string;
  contactEmail?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  
  itemOrder: number;
  itemType: 'service' | 'product' | 'fee' | 'discount';
  name: string;
  description?: string | null;
  
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  total: number;
  
  productId?: string | null;
  estimatedHours?: number | null;
}

// ==========================================
// TIME TRACKING
// ==========================================

export interface TimeEntry {
  id: string;
  myCompanyId: string;
  userId: string;
  
  projectId?: string | null;
  taskId?: string | null;
  contactId?: string | null;
  
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes: number;
  
  description?: string | null;
  
  isBillable: boolean;
  hourlyRate?: number | null;
  totalAmount: number;
  
  isRunning: boolean;
  isApproved: boolean;
  isInvoiced: boolean;
  
  tags: string[];
  
  // Joined data
  projectName?: string;
  taskTitle?: string;
  userName?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTimer {
  id: string;
  myCompanyId: string;
  userId: string;
  
  projectId?: string | null;
  taskId?: string | null;
  
  startedAt: string;
  description?: string | null;
  isBillable: boolean;
  
  // Calculated
  elapsedMinutes?: number;
  projectName?: string;
  taskTitle?: string;
}

// ==========================================
// NOTIFICACIONES
// ==========================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'mention' | 'assignment' | 'deadline' | 'payment' | 'system';

export interface Notification {
  id: string;
  myCompanyId: string;
  userId: string;
  
  title: string;
  message: string;
  notificationType: NotificationType;
  
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  
  isRead: boolean;
  readAt?: string | null;
  isArchived: boolean;
  
  priority: number;
  expiresAt?: string | null;
  
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  myCompanyId: string;
  
  preferences: Record<string, { in_app: boolean; email: boolean }>;
  
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietDays: number[];
  
  dailyDigest: boolean;
  weeklyDigest: boolean;
  digestTime: string;
}

// ==========================================
// AUTOMATIZACIONES
// ==========================================

export type AutomationTrigger = 
  | 'contact_created' | 'contact_updated' | 'contact_tag_added'
  | 'deal_created' | 'deal_stage_changed' | 'deal_won' | 'deal_lost'
  | 'project_created' | 'project_status_changed' | 'project_completed'
  | 'task_created' | 'task_completed' | 'task_overdue'
  | 'payment_received' | 'invoice_overdue'
  | 'scheduled' | 'recurring';

export type AutomationAction = 
  | 'send_email' | 'send_notification' | 'create_task' | 'update_field'
  | 'add_tag' | 'remove_tag' | 'assign_user' | 'create_activity'
  | 'move_deal_stage' | 'create_project' | 'webhook' | 'delay' | 'condition';

export interface Automation {
  id: string;
  myCompanyId: string;
  
  name: string;
  description?: string | null;
  
  triggerType: AutomationTrigger;
  triggerConditions: Record<string, unknown>;
  
  scheduleCron?: string | null;
  scheduleTimezone: string;
  
  isActive: boolean;
  runCount: number;
  lastRunAt?: string | null;
  lastError?: string | null;
  
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationStep {
  id: string;
  automationId: string;
  
  stepOrder: number;
  parentStepId?: string | null;
  
  actionType: AutomationAction;
  actionConfig: Record<string, unknown>;
  
  delayMinutes?: number | null;
  
  conditionField?: string | null;
  conditionOperator?: string | null;
  conditionValue?: string | null;
}

// ==========================================
// PRODUCTOS/SERVICIOS
// ==========================================

export interface Product {
  id: string;
  myCompanyId: string;
  
  sku?: string | null;
  name: string;
  description?: string | null;
  
  productType: 'service' | 'product' | 'subscription';
  
  currency: string;
  unitPrice: number;
  costPrice: number;
  unit: string;
  
  taxPercent: number;
  taxIncluded: boolean;
  
  isHourly: boolean;
  defaultHours?: number | null;
  
  category?: string | null;
  tags: string[];
  
  isActive: boolean;
  imageUrl?: string | null;
  
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// METAS Y OBJETIVOS
// ==========================================

export type GoalType = 'revenue' | 'deals_won' | 'deals_count' | 'projects_completed' | 'tasks_completed' | 'hours_logged' | 'custom';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type GoalStatus = 'active' | 'achieved' | 'failed' | 'cancelled';

export interface Goal {
  id: string;
  myCompanyId: string;
  userId?: string | null;
  
  name: string;
  description?: string | null;
  
  goalType: GoalType;
  metricField?: string | null;
  
  targetValue: number;
  currentValue: number;
  
  periodType: GoalPeriod;
  startDate: string;
  endDate: string;
  
  status: GoalStatus;
  achievedAt?: string | null;
  
  notifyAtPercent: number[];
  
  // Calculated
  progressPercent?: number;
  
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// DASHBOARD METRICS
// ==========================================

export interface SalesDashboard {
  dealsThisMonth: number;
  pipelineThisMonth: number;
  wonThisMonth: number;
  revenueThisMonth: number;
  wonLastMonth: number;
  revenueLastMonth: number;
  wonThisYear: number;
  revenueThisYear: number;
  activeDeals: number;
  activePipeline: number;
}

export interface ProductivityDashboard {
  hoursThisWeek: number;
  hoursThisMonth: number;
  billableHoursThisMonth: number;
  billableAmountThisMonth: number;
  projectsWorkedThisMonth: number;
}

export interface DashboardMetrics {
  sales: SalesDashboard;
  productivity: ProductivityDashboard;
  
  // Quick stats
  activeProjects: number;
  pendingTasks: number;
  overdueInvoices: number;
  hotLeads: number;
  pendingFollowUps: number;
  unreadNotifications: number;
  
  // Goals progress
  activeGoals: Goal[];
}

// Legacy types for backward compatibility
export interface ContactHistory {
  id: string;
  contactId: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'deal' | 'payment';
  title: string;
  description?: string | null;
  date: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface LeadScore {
  contactId: string;
  score: number; // 0-100
  temperature: LeadTemperature;
  lastActivity?: string | null;
  factors: {
    engagement: number;
    interest: number;
    budget: number;
    timing: number;
  };
}
