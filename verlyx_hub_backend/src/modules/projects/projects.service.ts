import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateProjectDto, ProjectStatus } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { PaginatedResponse } from '@/common/dto/pagination.dto';
import { Project, ProjectWithMetrics } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createProjectDto: CreateProjectDto, userId?: string): Promise<Project> {
    console.log('Creating project with data:', createProjectDto);
    
    // Validate dates
    if (createProjectDto.startDate && createProjectDto.dueDate) {
      const startDate = new Date(createProjectDto.startDate);
      const dueDate = new Date(createProjectDto.dueDate);
      
      if (dueDate <= startDate) {
        throw new BadRequestException('Due date must be after start date');
      }
    }

    // Validate budget
    if (createProjectDto.budget !== undefined && createProjectDto.budget < 0) {
      throw new BadRequestException('Budget must be a positive number');
    }

    const insertData = {
      my_company_id: createProjectDto.myCompanyId,
      client_company_id: createProjectDto.clientCompanyId,
      company_id: createProjectDto.companyId, // Deprecated - kept for backward compatibility
      name: createProjectDto.name,
      description: createProjectDto.description,
      status: createProjectDto.status || ProjectStatus.BACKLOG,
      priority: createProjectDto.priority || 'medium',
      budget: createProjectDto.budget,
      spent_amount: createProjectDto.spentAmount || 0,
      currency: createProjectDto.currency || 'USD',
      start_date: createProjectDto.startDate,
      // due_date: createProjectDto.dueDate, // Column doesn't exist in DB
      completion_date: createProjectDto.completionDate,
      progress_percentage: createProjectDto.progressPercentage || 0,
      client_id: createProjectDto.clientId,
      client_organization_id: createProjectDto.clientOrganizationId,
      deal_id: createProjectDto.dealId,
      project_manager_id: createProjectDto.projectManagerId,
      tags: createProjectDto.tags || [],
      custom_fields: createProjectDto.customFields || {},
      is_archived: createProjectDto.isArchived || false,
      created_by: userId && userId !== 'anonymous' ? userId : null,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }

    console.log('Project created successfully:', data);
    return this.mapProject(data);
  }

  async findAll(filterDto: FilterProjectsDto): Promise<PaginatedResponse<ProjectWithMetrics>> {
    const { 
      page = 1, 
      limit = 20, 
      companyId,
      status, 
      priority, 
      search, 
      clientId,
      projectManagerId,
      startDateFrom,
      startDateTo,
      dueDateFrom,
      dueDateTo,
      includeArchived = false,
      tag
    } = filterDto;
    
    const offset = (page - 1) * limit;

    let query = this.supabaseService
      .getClient()
      .from('projects')
      .select('*', { count: 'exact' });

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (projectManagerId) {
      query = query.eq('project_manager_id', projectManagerId);
    }
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    if (startDateFrom) {
      query = query.gte('start_date', startDateFrom);
    }
    if (startDateTo) {
      query = query.lte('start_date', startDateTo);
    }
    if (dueDateFrom) {
      query = query.gte('due_date', dueDateFrom);
    }
    if (dueDateTo) {
      query = query.lte('due_date', dueDateTo);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    // Enrich with metrics
    const projectsWithMetrics = data.map((project) => this.enrichWithMetrics(this.mapProject(project)));

    return {
      data: projectsWithMetrics,
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProjectWithMetrics> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const project = this.mapProject(data);
    return this.enrichWithMetrics(project);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    // Validate status transition if status is being changed
    if (updateProjectDto.status) {
      const existingProject = await this.findOne(id);
      this.validateStatusTransition(existingProject.status, updateProjectDto.status);
    }

    // Validate dates if being updated
    if (updateProjectDto.startDate || updateProjectDto.dueDate) {
      const existingProject = await this.findOne(id);
      const startDate = new Date(updateProjectDto.startDate || existingProject.startDate);
      const dueDate = new Date(updateProjectDto.dueDate || existingProject.dueDate);
      
      if (dueDate <= startDate) {
        throw new BadRequestException('Due date must be after start date');
      }
    }

    const updateData: any = {};
    
    if (updateProjectDto.myCompanyId !== undefined) updateData.my_company_id = updateProjectDto.myCompanyId;
    if (updateProjectDto.clientCompanyId !== undefined) updateData.client_company_id = updateProjectDto.clientCompanyId;
    if (updateProjectDto.companyId !== undefined) updateData.company_id = updateProjectDto.companyId; // Deprecated
    if (updateProjectDto.name !== undefined) updateData.name = updateProjectDto.name;
    if (updateProjectDto.description !== undefined) updateData.description = updateProjectDto.description;
    if (updateProjectDto.status !== undefined) updateData.status = updateProjectDto.status;
    if (updateProjectDto.priority !== undefined) updateData.priority = updateProjectDto.priority;
    if (updateProjectDto.budget !== undefined) updateData.budget = updateProjectDto.budget;
    if (updateProjectDto.spentAmount !== undefined) updateData.spent_amount = updateProjectDto.spentAmount;
    if (updateProjectDto.currency !== undefined) updateData.currency = updateProjectDto.currency;
    if (updateProjectDto.startDate !== undefined) updateData.start_date = updateProjectDto.startDate;
    // if (updateProjectDto.dueDate !== undefined) updateData.due_date = updateProjectDto.dueDate; // Column doesn't exist
    if (updateProjectDto.completionDate !== undefined) updateData.completion_date = updateProjectDto.completionDate;
    if (updateProjectDto.progressPercentage !== undefined) updateData.progress_percentage = updateProjectDto.progressPercentage;
    if (updateProjectDto.clientId !== undefined) updateData.client_id = updateProjectDto.clientId;
    if (updateProjectDto.clientOrganizationId !== undefined) updateData.client_organization_id = updateProjectDto.clientOrganizationId;
    if (updateProjectDto.dealId !== undefined) updateData.deal_id = updateProjectDto.dealId;
    if (updateProjectDto.projectManagerId !== undefined) updateData.project_manager_id = updateProjectDto.projectManagerId;
    if (updateProjectDto.tags !== undefined) updateData.tags = updateProjectDto.tags;
    if (updateProjectDto.customFields !== undefined) updateData.custom_fields = updateProjectDto.customFields;
    if (updateProjectDto.isArchived !== undefined) updateData.is_archived = updateProjectDto.isArchived;

    // Auto-set completion date when marking as done
    if (updateProjectDto.status === ProjectStatus.DONE && !updateData.completion_date) {
      updateData.completion_date = new Date().toISOString();
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return this.mapProject(data);
  }

  async remove(id: string): Promise<{ message: string }> {
    const { error } = await this.supabaseService
      .getClient()
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }

    return { message: 'Project deleted successfully' };
  }

  async getStats(companyId?: string): Promise<any> {
    const supabase = this.supabaseService.getClient();

    let baseQuery = supabase.from('projects').select('*');
    
    if (companyId) {
      baseQuery = baseQuery.eq('company_id', companyId);
    }

    const { data: projects, error } = await baseQuery;

    if (error) {
      throw new Error(`Failed to fetch project stats: ${error.message}`);
    }

    // Calculate comprehensive stats
    const stats = {
      total: projects.length,
      active: projects.filter(p => !p.is_archived && p.status !== 'done' && p.status !== 'cancelled').length,
      completed: projects.filter(p => p.status === 'done').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length,
      archived: projects.filter(p => p.is_archived).length,
      byStatus: this.groupByField(projects, 'status'),
      byPriority: this.groupByField(projects, 'priority'),
      totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalSpent: projects.reduce((sum, p) => sum + (p.spent_amount || 0), 0),
      overdue: projects.filter(p => {
        if (!p.due_date || p.status === 'done' || p.status === 'cancelled') return false;
        return new Date(p.due_date) < new Date();
      }).length,
      averageProgress: projects.length > 0 
        ? projects.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / projects.length 
        : 0,
    };

    // Calculate profitability
    if (stats.totalBudget > 0) {
      stats['profitability'] = stats.totalBudget - stats.totalSpent;
      stats['profitabilityPercentage'] = ((stats.totalBudget - stats.totalSpent) / stats.totalBudget) * 100;
    }

    return stats;
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    // Allow all status transitions - users can move freely between any states
    const validTransitions: Record<string, string[]> = {
      [ProjectStatus.BACKLOG]: [ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.REVIEW, ProjectStatus.DONE, ProjectStatus.CANCELLED],
      [ProjectStatus.PLANNING]: [ProjectStatus.BACKLOG, ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.REVIEW, ProjectStatus.DONE, ProjectStatus.CANCELLED],
      [ProjectStatus.IN_PROGRESS]: [ProjectStatus.BACKLOG, ProjectStatus.PLANNING, ProjectStatus.ON_HOLD, ProjectStatus.REVIEW, ProjectStatus.DONE, ProjectStatus.CANCELLED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.BACKLOG, ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS, ProjectStatus.REVIEW, ProjectStatus.DONE, ProjectStatus.CANCELLED],
      [ProjectStatus.REVIEW]: [ProjectStatus.BACKLOG, ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.DONE, ProjectStatus.CANCELLED],
      [ProjectStatus.DONE]: [ProjectStatus.BACKLOG, ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.REVIEW, ProjectStatus.CANCELLED],
      [ProjectStatus.CANCELLED]: [ProjectStatus.BACKLOG, ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.REVIEW, ProjectStatus.DONE],
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    
    if (currentStatus !== newStatus && !allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`
      );
    }
  }

  private enrichWithMetrics(project: Project): ProjectWithMetrics {
    const enriched: ProjectWithMetrics = { ...project };

    // Calculate profitability
    if (project.budget && project.spentAmount !== undefined) {
      enriched.profitability = project.budget - project.spentAmount;
      if (project.budget > 0) {
        enriched.profitabilityPercentage = (enriched.profitability / project.budget) * 100;
      }
    }

    // Check if overdue
    if (project.dueDate && project.status !== 'done' && project.status !== 'cancelled') {
      const now = new Date();
      const dueDate = new Date(project.dueDate);
      enriched.isOverdue = dueDate < now;
      
      if (!enriched.isOverdue) {
        const diffTime = dueDate.getTime() - now.getTime();
        enriched.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return enriched;
  }

  private groupByField(projects: any[], field: string): Record<string, number> {
    return projects.reduce((acc, project) => {
      const value = project[field];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private mapProject(data: any): Project {
    return {
      id: data.id,
      myCompanyId: data.my_company_id,
      clientCompanyId: data.client_company_id,
      companyId: data.company_id, // Deprecated
      clientId: data.client_id,
      clientOrganizationId: data.client_organization_id,
      dealId: data.deal_id,
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      budget: data.budget,
      spentAmount: data.spent_amount,
      currency: data.currency,
      startDate: data.start_date,
      dueDate: data.due_date,
      completionDate: data.completion_date,
      progressPercentage: data.progress_percentage,
      projectManagerId: data.project_manager_id,
      tags: data.tags || [],
      customFields: data.custom_fields || {},
      isArchived: data.is_archived,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
