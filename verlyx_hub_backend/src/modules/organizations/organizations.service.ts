import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(createDto: CreateOrganizationDto, userId: string): Promise<OrganizationResponseDto> {
    this.logger.log('Creating organization:', createDto);

    const insertData = {
      my_company_id: createDto.myCompanyId,
      client_id: createDto.clientId,
      parent_organization_id: createDto.parentOrganizationId,
      name: createDto.name,
      code: createDto.code,
      type: createDto.type || 'BRANCH',
      address: createDto.address,
      city: createDto.city,
      state: createDto.state,
      country: createDto.country,
      postal_code: createDto.postalCode,
      latitude: createDto.latitude,
      longitude: createDto.longitude,
      phone: createDto.phone,
      email: createDto.email,
      website: createDto.website,
      employees_count: createDto.employeesCount,
      size: createDto.size,
      business_hours: createDto.businessHours,
      timezone: createDto.timezone,
      primary_contact_name: createDto.primaryContactName,
      primary_contact_email: createDto.primaryContactEmail,
      primary_contact_phone: createDto.primaryContactPhone,
      tags: createDto.tags,
      custom_fields: createDto.customFields,
      notes: createDto.notes,
      is_active: createDto.isActive !== undefined ? createDto.isActive : true,
      created_by: userId,
    };

    const { data, error } = await this.supabaseService.getClient()
      .from('client_organizations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating organization:', error);
      throw new BadRequestException(error.message);
    }

    return this.mapToResponseDto(data);
  }

  async findAll(myCompanyId: string, clientId?: string): Promise<OrganizationResponseDto[]> {
    let query = this.supabaseService.getClient()
      .from('client_organizations')
      .select('*')
      .eq('my_company_id', myCompanyId)
      .order('name', { ascending: true });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error fetching organizations:', error);
      throw new BadRequestException(error.message);
    }

    return data.map(org => this.mapToResponseDto(org));
  }

  async findOne(id: string): Promise<OrganizationResponseDto> {
    const { data, error } = await this.supabaseService.getClient()
      .from('client_organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error('Organization not found:', id);
      throw new NotFoundException('Organization not found');
    }

    return this.mapToResponseDto(data);
  }

  async getHierarchy(clientId: string): Promise<OrganizationResponseDto[]> {
    const { data, error } = await this.supabaseService.getClient()
      .rpc('get_organization_hierarchy', { p_client_id: clientId });

    if (error) {
      this.logger.error('Error fetching hierarchy:', error);
      throw new BadRequestException(error.message);
    }

    // Construir árbol jerárquico
    return this.buildTree(data);
  }

  async update(id: string, updateDto: UpdateOrganizationDto): Promise<OrganizationResponseDto> {
    const updateData: any = {};

    if (updateDto.parentOrganizationId !== undefined) updateData.parent_organization_id = updateDto.parentOrganizationId;
    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.code !== undefined) updateData.code = updateDto.code;
    if (updateDto.type !== undefined) updateData.type = updateDto.type;
    if (updateDto.address !== undefined) updateData.address = updateDto.address;
    if (updateDto.city !== undefined) updateData.city = updateDto.city;
    if (updateDto.state !== undefined) updateData.state = updateDto.state;
    if (updateDto.country !== undefined) updateData.country = updateDto.country;
    if (updateDto.postalCode !== undefined) updateData.postal_code = updateDto.postalCode;
    if (updateDto.latitude !== undefined) updateData.latitude = updateDto.latitude;
    if (updateDto.longitude !== undefined) updateData.longitude = updateDto.longitude;
    if (updateDto.phone !== undefined) updateData.phone = updateDto.phone;
    if (updateDto.email !== undefined) updateData.email = updateDto.email;
    if (updateDto.website !== undefined) updateData.website = updateDto.website;
    if (updateDto.employeesCount !== undefined) updateData.employees_count = updateDto.employeesCount;
    if (updateDto.size !== undefined) updateData.size = updateDto.size;
    if (updateDto.businessHours !== undefined) updateData.business_hours = updateDto.businessHours;
    if (updateDto.timezone !== undefined) updateData.timezone = updateDto.timezone;
    if (updateDto.primaryContactName !== undefined) updateData.primary_contact_name = updateDto.primaryContactName;
    if (updateDto.primaryContactEmail !== undefined) updateData.primary_contact_email = updateDto.primaryContactEmail;
    if (updateDto.primaryContactPhone !== undefined) updateData.primary_contact_phone = updateDto.primaryContactPhone;
    if (updateDto.tags !== undefined) updateData.tags = updateDto.tags;
    if (updateDto.customFields !== undefined) updateData.custom_fields = updateDto.customFields;
    if (updateDto.notes !== undefined) updateData.notes = updateDto.notes;
    if (updateDto.isActive !== undefined) updateData.is_active = updateDto.isActive;

    const { data, error } = await this.supabaseService.getClient()
      .from('client_organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Error updating organization:', error);
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Organization not found');
    }

    return this.mapToResponseDto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient()
      .from('client_organizations')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Error deleting organization:', error);
      throw new BadRequestException(error.message);
    }
  }

  private mapToResponseDto(data: any): OrganizationResponseDto {
    return {
      id: data.id,
      myCompanyId: data.my_company_id,
      clientId: data.client_id,
      parentOrganizationId: data.parent_organization_id,
      name: data.name,
      code: data.code,
      type: data.type,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postal_code,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      email: data.email,
      website: data.website,
      employeesCount: data.employees_count,
      size: data.size,
      businessHours: data.business_hours,
      timezone: data.timezone,
      primaryContactName: data.primary_contact_name,
      primaryContactEmail: data.primary_contact_email,
      primaryContactPhone: data.primary_contact_phone,
      tags: data.tags,
      customFields: data.custom_fields,
      notes: data.notes,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      level: data.level,
      path: data.path,
    };
  }

  private buildTree(flatList: any[]): OrganizationResponseDto[] {
    const map = new Map<string, OrganizationResponseDto>();
    const roots: OrganizationResponseDto[] = [];

    // Mapear todos los nodos
    flatList.forEach(item => {
      const dto = this.mapToResponseDto(item);
      dto.children = [];
      map.set(dto.id, dto);
    });

    // Construir árbol
    map.forEach(node => {
      if (node.parentOrganizationId) {
        const parent = map.get(node.parentOrganizationId);
        if (parent) {
          parent.children!.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
