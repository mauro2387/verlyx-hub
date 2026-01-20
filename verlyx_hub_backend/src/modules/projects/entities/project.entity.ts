export interface Project {
  id: string;
  myCompanyId?: string;
  clientCompanyId?: string;
  companyId?: string; // Deprecated - use myCompanyId or clientCompanyId
  clientId?: string;
  clientOrganizationId?: string;
  dealId?: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  budget?: number;
  spentAmount?: number;
  currency?: string;
  startDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  progressPercentage?: number;
  projectManagerId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  isArchived: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithMetrics extends Project {
  profitability?: number;
  profitabilityPercentage?: number;
  isOverdue?: boolean;
  daysRemaining?: number;
  taskCount?: number;
  completedTaskCount?: number;
}
