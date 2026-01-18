import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateTaskDto, TaskStatus } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { PaginatedResponse } from '@/common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createTaskDto: CreateTaskDto) {
    console.log('Creating task with data:', createTaskDto);
    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tasks')
      .insert({
        my_company_id: createTaskDto.myCompanyId,
        project_id: createTaskDto.projectId,
        deal_id: createTaskDto.dealId,
        client_id: createTaskDto.clientId,
        organization_id: createTaskDto.organizationId,
        parent_task_id: createTaskDto.parentTaskId,
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status || TaskStatus.TODO,
        priority: createTaskDto.priority,
        assigned_to: createTaskDto.assignedTo,
        assigned_users: createTaskDto.assignedUsers,
        start_date: createTaskDto.startDate,
        due_date: createTaskDto.dueDate,
        estimated_hours: createTaskDto.estimatedHours,
        actual_hours: createTaskDto.actualHours || 0,
        progress_percentage: createTaskDto.progressPercentage || 0,
        is_blocked: createTaskDto.isBlocked || false,
        blocked_reason: createTaskDto.blockedReason,
        tags: createTaskDto.tags,
        custom_fields: createTaskDto.customFields,
        attachments: createTaskDto.attachments,
        checklist: createTaskDto.checklist,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }

    console.log('Task created successfully:', data);
    return this.mapTask(data);
  }

  async findAll(filterDto: FilterTasksDto): Promise<PaginatedResponse<any>> {
    const { 
      page = 1, 
      limit = 20, 
      myCompanyId,
      status, 
      priority, 
      search, 
      projectId, 
      dealId,
      clientId,
      organizationId,
      assignedTo,
      isBlocked,
      parentTaskId
    } = filterDto;
    const offset = (page - 1) * limit;

    let query = this.supabaseService
      .getClient()
      .from('tasks')
      .select('*', { count: 'exact' });

    if (myCompanyId) {
      query = query.eq('my_company_id', myCompanyId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (dealId) {
      query = query.eq('deal_id', dealId);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }
    if (isBlocked !== undefined) {
      query = query.eq('is_blocked', isBlocked);
    }
    if (parentTaskId) {
      query = query.eq('parent_task_id', parentTaskId);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return {
      data: data.map((task) => this.mapTask(task)),
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return this.mapTask(data);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const updateData: any = {};

    // Solo agregar campos que estén definidos
    if (updateTaskDto.title !== undefined) updateData.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) updateData.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined) updateData.status = updateTaskDto.status;
    if (updateTaskDto.priority !== undefined) updateData.priority = updateTaskDto.priority;
    if (updateTaskDto.assignedTo !== undefined) updateData.assigned_to = updateTaskDto.assignedTo;
    if (updateTaskDto.assignedUsers !== undefined) updateData.assigned_users = updateTaskDto.assignedUsers;
    if (updateTaskDto.startDate !== undefined) updateData.start_date = updateTaskDto.startDate;
    if (updateTaskDto.dueDate !== undefined) updateData.due_date = updateTaskDto.dueDate;
    if (updateTaskDto.estimatedHours !== undefined) updateData.estimated_hours = updateTaskDto.estimatedHours;
    if (updateTaskDto.actualHours !== undefined) updateData.actual_hours = updateTaskDto.actualHours;
    if (updateTaskDto.progressPercentage !== undefined) updateData.progress_percentage = updateTaskDto.progressPercentage;
    if (updateTaskDto.isBlocked !== undefined) updateData.is_blocked = updateTaskDto.isBlocked;
    if (updateTaskDto.blockedReason !== undefined) updateData.blocked_reason = updateTaskDto.blockedReason;
    if (updateTaskDto.tags !== undefined) updateData.tags = updateTaskDto.tags;
    if (updateTaskDto.customFields !== undefined) updateData.custom_fields = updateTaskDto.customFields;
    if (updateTaskDto.attachments !== undefined) updateData.attachments = updateTaskDto.attachments;
    if (updateTaskDto.checklist !== undefined) updateData.checklist = updateTaskDto.checklist;
    if (updateTaskDto.projectId !== undefined) updateData.project_id = updateTaskDto.projectId;
    if (updateTaskDto.dealId !== undefined) updateData.deal_id = updateTaskDto.dealId;
    if (updateTaskDto.clientId !== undefined) updateData.client_id = updateTaskDto.clientId;
    if (updateTaskDto.organizationId !== undefined) updateData.organization_id = updateTaskDto.organizationId;
    if (updateTaskDto.parentTaskId !== undefined) updateData.parent_task_id = updateTaskDto.parentTaskId;

    // El trigger update_task_completed_at maneja automáticamente completed_at

    const { data, error } = await this.supabaseService
      .getClient()
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return this.mapTask(data);
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return { message: 'Task deleted successfully' };
  }

  // Nuevo: Obtener jerarquía de subtareas
  async getHierarchy(taskId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_task_hierarchy', { task_id: taskId });

    if (error) {
      throw new Error(`Failed to get task hierarchy: ${error.message}`);
    }

    return data;
  }

  // Nuevo: Obtener estadísticas de tareas
  async getStats(myCompanyId: string, projectId?: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_tasks_stats', { 
        p_my_company_id: myCompanyId,
        p_project_id: projectId || null
      });

    if (error) {
      throw new Error(`Failed to get tasks stats: ${error.message}`);
    }

    return data;
  }

  // Nuevo: Obtener tareas vencidas
  async getOverdue(myCompanyId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_overdue_tasks', { p_my_company_id: myCompanyId });

    if (error) {
      throw new Error(`Failed to get overdue tasks: ${error.message}`);
    }

    return data.map((task) => this.mapTask(task));
  }

  private mapTask(data: any) {
    return {
      id: data.id,
      myCompanyId: data.my_company_id,
      projectId: data.project_id,
      dealId: data.deal_id,
      clientId: data.client_id,
      organizationId: data.organization_id,
      parentTaskId: data.parent_task_id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      createdBy: data.created_by,
      assignedTo: data.assigned_to,
      assignedUsers: data.assigned_users,
      startDate: data.start_date,
      dueDate: data.due_date,
      completedAt: data.completed_at,
      estimatedHours: data.estimated_hours,
      actualHours: data.actual_hours,
      progressPercentage: data.progress_percentage,
      isBlocked: data.is_blocked,
      blockedReason: data.blocked_reason,
      tags: data.tags,
      customFields: data.custom_fields,
      attachments: data.attachments,
      checklist: data.checklist,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
