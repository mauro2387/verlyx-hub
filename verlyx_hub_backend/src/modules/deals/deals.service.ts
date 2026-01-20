import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateDealDto, UpdateDealDto, MoveDealStageDto, DealResponseDto, PipelineStatsDto, DealStage } from './dto';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(createDto: CreateDealDto, userId: string): Promise<DealResponseDto> {
    this.logger.log('Creating deal:', createDto);

    const insertData = {
      my_company_id: createDto.myCompanyId,
      client_id: createDto.clientId,
      organization_id: createDto.organizationId,
      title: createDto.title,
      description: createDto.description,
      stage: createDto.stage || 'LEAD',
      priority: createDto.priority || 'MEDIUM',
      amount: createDto.amount,
      currency: createDto.currency || 'ARS',
      probability: createDto.probability !== undefined ? createDto.probability : 50,
      expected_close_date: createDto.expectedCloseDate,
      owner_user_id: createDto.ownerUserId || userId,
      assigned_users: createDto.assignedUsers,
      source: createDto.source,
      source_details: createDto.sourceDetails,
      primary_contact_id: createDto.primaryContactId,
      tags: createDto.tags,
      custom_fields: createDto.customFields,
      next_action: createDto.nextAction,
      next_action_date: createDto.nextActionDate,
      is_active: createDto.isActive !== undefined ? createDto.isActive : true,
      created_by: userId,
    };

    const { data, error } = await this.supabaseService.getClient()
      .from('deals')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating deal:', error);
      throw new BadRequestException(error.message);
    }

    return this.mapToResponseDto(data);
  }

  async findAll(myCompanyId: string, stage?: DealStage, clientId?: string): Promise<DealResponseDto[]> {
    let query = this.supabaseService.getClient()
      .from('deals')
      .select('*')
      .eq('my_company_id', myCompanyId)
      .order('created_at', { ascending: false });

    if (stage) {
      query = query.eq('stage', stage);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error fetching deals:', error);
      throw new BadRequestException(error.message);
    }

    return data.map(deal => this.mapToResponseDto(deal));
  }

  async findOne(id: string): Promise<DealResponseDto> {
    const { data, error } = await this.supabaseService.getClient()
      .from('deals')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error('Deal not found:', id);
      throw new NotFoundException('Deal not found');
    }

    return this.mapToResponseDto(data);
  }

  async getPipelineStats(myCompanyId: string): Promise<PipelineStatsDto[]> {
    const { data, error } = await this.supabaseService.getClient()
      .rpc('get_pipeline_stats', { p_my_company_id: myCompanyId });

    if (error) {
      this.logger.error('Error fetching pipeline stats:', error);
      throw new BadRequestException(error.message);
    }

    return data.map((stat: any) => ({
      stage: stat.stage,
      count: parseInt(stat.count),
      totalAmount: parseFloat(stat.total_amount),
      avgAmount: parseFloat(stat.avg_amount),
      totalWeighted: parseFloat(stat.total_weighted),
    }));
  }

  async moveToStage(id: string, moveDto: MoveDealStageDto): Promise<DealResponseDto> {
    // Validar razón requerida para cierre
    if ((moveDto.newStage === DealStage.CLOSED_WON || moveDto.newStage === DealStage.CLOSED_LOST) && !moveDto.reason) {
      throw new BadRequestException('Reason is required when closing a deal');
    }

    const { data, error } = await this.supabaseService.getClient()
      .rpc('move_deal_to_stage', {
        p_deal_id: id,
        p_new_stage: moveDto.newStage,
        p_reason: moveDto.reason || null,
      });

    if (error) {
      this.logger.error('Error moving deal to stage:', error);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Deal not found');
    }

    // Recargar el deal actualizado
    return this.findOne(id);
  }

  async update(id: string, updateDto: UpdateDealDto): Promise<DealResponseDto> {
    const updateData: any = {};

    if (updateDto.organizationId !== undefined) updateData.organization_id = updateDto.organizationId;
    if (updateDto.title !== undefined) updateData.title = updateDto.title;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.stage !== undefined) updateData.stage = updateDto.stage;
    if (updateDto.priority !== undefined) updateData.priority = updateDto.priority;
    if (updateDto.amount !== undefined) updateData.amount = updateDto.amount;
    if (updateDto.currency !== undefined) updateData.currency = updateDto.currency;
    if (updateDto.probability !== undefined) updateData.probability = updateDto.probability;
    if (updateDto.expectedCloseDate !== undefined) updateData.expected_close_date = updateDto.expectedCloseDate;
    if (updateDto.ownerUserId !== undefined) updateData.owner_user_id = updateDto.ownerUserId;
    if (updateDto.assignedUsers !== undefined) updateData.assigned_users = updateDto.assignedUsers;
    if (updateDto.source !== undefined) updateData.source = updateDto.source;
    if (updateDto.sourceDetails !== undefined) updateData.source_details = updateDto.sourceDetails;
    if (updateDto.primaryContactId !== undefined) updateData.primary_contact_id = updateDto.primaryContactId;
    if (updateDto.tags !== undefined) updateData.tags = updateDto.tags;
    if (updateDto.customFields !== undefined) updateData.custom_fields = updateDto.customFields;
    if (updateDto.nextAction !== undefined) updateData.next_action = updateDto.nextAction;
    if (updateDto.nextActionDate !== undefined) updateData.next_action_date = updateDto.nextActionDate;
    if (updateDto.isActive !== undefined) updateData.is_active = updateDto.isActive;

    const { data, error } = await this.supabaseService.getClient()
      .from('deals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Error updating deal:', error);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Deal not found');
    }

    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient()
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Error deleting deal:', error);
      throw new BadRequestException(error.message);
    }
  }

  async createProjectFromDeal(dealId: string, projectName?: string, projectDescription?: string) {
    const { data, error } = await this.supabaseService.getClient()
      .rpc('create_project_from_deal', {
        p_deal_id: dealId,
        p_project_name: projectName || null,
        p_project_description: projectDescription || null,
      });

    if (error) {
      this.logger.error('Error creating project from deal:', error);
      throw new BadRequestException(error.message);
    }

    return data; // Returns project ID
  }

  private mapToResponseDto(data: any): DealResponseDto {
    return {
      id: data.id,
      myCompanyId: data.my_company_id,
      clientId: data.client_id,
      organizationId: data.organization_id,
      title: data.title,
      description: data.description,
      stage: data.stage,
      priority: data.priority,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      currency: data.currency,
      probability: data.probability,
      expectedRevenue: data.expected_revenue ? parseFloat(data.expected_revenue) : undefined,
      expectedCloseDate: data.expected_close_date,
      actualCloseDate: data.actual_close_date,
      lostDate: data.lost_date,
      lostReason: data.lost_reason,
      wonReason: data.won_reason,
      ownerUserId: data.owner_user_id,
      assignedUsers: data.assigned_users,
      source: data.source,
      sourceDetails: data.source_details,
      primaryContactId: data.primary_contact_id,
      tags: data.tags,
      customFields: data.custom_fields,
      stageChangedAt: data.stage_changed_at,
      daysInStage: data.days_in_stage,
      nextAction: data.next_action,
      nextActionDate: data.next_action_date,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  }
}
