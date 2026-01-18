import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';
import { CompanyUser } from './entities/company-user.entity';

@Injectable()
export class CompanyService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Crear nueva empresa
   * Automáticamente crea un CompanyUser con rol OWNER
   */
  async create(userId: string, createCompanyDto: CreateCompanyDto): Promise<Company> {
    const { data, error } = await this.supabase.getClient()
      .from('companies')
      .insert({
        owner_user_id: userId,
        name: createCompanyDto.name,
        type: createCompanyDto.type,
        description: createCompanyDto.description,
        logo_url: createCompanyDto.logoUrl,
        primary_color: createCompanyDto.primaryColor || '#6366f1',
        secondary_color: createCompanyDto.secondaryColor || '#8b5cf6',
        settings: createCompanyDto.settings || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapCompany(data);
  }

  /**
   * Obtener todas las empresas del usuario
   */
  async findAllByUser(userId: string): Promise<Company[]> {
    // Simplified: only return companies where user is owner
    // TODO: Add support for company_users relationship
    const { data, error } = await this.supabase.getClient()
      .from('companies')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapCompany);
  }

  /**
   * Obtener empresa por ID
   */
  async findOne(userId: string, companyId: string): Promise<Company> {
    // Verificar acceso
    const hasAccess = await this.userHasAccess(userId, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    const { data, error } = await this.supabase.getClient()
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (error) throw new NotFoundException('Empresa no encontrada');

    return this.mapCompany(data);
  }

  /**
   * Actualizar empresa
   */
  async update(
    userId: string,
    companyId: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    // Solo el owner puede actualizar
    const isOwner = await this.isOwner(userId, companyId);
    if (!isOwner) {
      throw new ForbiddenException('Solo el dueño puede actualizar la empresa');
    }

    const updateData: any = {};
    if (updateCompanyDto.name) updateData.name = updateCompanyDto.name;
    if (updateCompanyDto.type) updateData.type = updateCompanyDto.type;
    if (updateCompanyDto.description !== undefined) updateData.description = updateCompanyDto.description;
    if (updateCompanyDto.logoUrl !== undefined) updateData.logo_url = updateCompanyDto.logoUrl;
    if (updateCompanyDto.primaryColor) updateData.primary_color = updateCompanyDto.primaryColor;
    if (updateCompanyDto.secondaryColor) updateData.secondary_color = updateCompanyDto.secondaryColor;
    if (updateCompanyDto.settings) updateData.settings = updateCompanyDto.settings;
    if (updateCompanyDto.isActive !== undefined) updateData.is_active = updateCompanyDto.isActive;

    const { data, error } = await this.supabase.getClient()
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;

    return this.mapCompany(data);
  }

  /**
   * Eliminar empresa (solo owner)
   */
  async remove(userId: string, companyId: string): Promise<void> {
    const isOwner = await this.isOwner(userId, companyId);
    if (!isOwner) {
      throw new ForbiddenException('Solo el dueño puede eliminar la empresa');
    }

    const { error } = await this.supabase.getClient()
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;
  }

  /**
   * Obtener miembros de la empresa
   */
  async getMembers(userId: string, companyId: string): Promise<CompanyUser[]> {
    const hasAccess = await this.userHasAccess(userId, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    const { data, error } = await this.supabase.getClient()
      .from('company_users')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('role', { ascending: true });

    if (error) throw error;

    return (data || []).map(this.mapCompanyUser);
  }

  /**
   * Invitar usuario a empresa
   */
  async inviteMember(
    userId: string,
    companyId: string,
    invitedUserId: string,
    role: string,
  ): Promise<CompanyUser> {
    // Solo OWNER y ADMIN pueden invitar
    const canInvite = await this.userHasRole(userId, companyId, ['OWNER', 'ADMIN']);
    if (!canInvite) {
      throw new ForbiddenException('No tienes permisos para invitar usuarios');
    }

    const { data, error } = await this.supabase.getClient()
      .from('company_users')
      .insert({
        company_id: companyId,
        user_id: invitedUserId,
        role: role,
        invited_by: userId,
        invited_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapCompanyUser(data);
  }

  /**
   * Actualizar rol de miembro
   */
  async updateMemberRole(
    userId: string,
    companyId: string,
    memberId: string,
    role: string,
  ): Promise<CompanyUser> {
    const canUpdate = await this.userHasRole(userId, companyId, ['OWNER', 'ADMIN']);
    if (!canUpdate) {
      throw new ForbiddenException('No tienes permisos para actualizar roles');
    }

    const { data, error } = await this.supabase.getClient()
      .from('company_users')
      .update({ role })
      .eq('id', memberId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;

    return this.mapCompanyUser(data);
  }

  /**
   * Remover miembro de empresa
   */
  async removeMember(userId: string, companyId: string, memberId: string): Promise<void> {
    const canRemove = await this.userHasRole(userId, companyId, ['OWNER', 'ADMIN']);
    if (!canRemove) {
      throw new ForbiddenException('No tienes permisos para remover usuarios');
    }

    const { error} = await this.supabase.getClient()
      .from('company_users')
      .delete()
      .eq('id', memberId)
      .eq('company_id', companyId);

    if (error) throw error;
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async userHasAccess(userId: string, companyId: string): Promise<boolean> {
    const { data } = await this.supabase.getClient()
      .from('company_users')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (data) return true;

    // Verificar si es owner
    const { data: company } = await this.supabase.getClient()
      .from('companies')
      .select('owner_user_id')
      .eq('id', companyId)
      .maybeSingle();

    return company?.owner_user_id === userId;
  }

  private async isOwner(userId: string, companyId: string): Promise<boolean> {
    const { data } = await this.supabase.getClient()
      .from('companies')
      .select('owner_user_id')
      .eq('id', companyId)
      .maybeSingle();

    return data?.owner_user_id === userId;
  }

  async userHasRole(
    userId: string,
    companyId: string,
    roles: string[],
  ): Promise<boolean> {
    const { data } = await this.supabase.getClient()
      .from('company_users')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (data && roles.includes(data.role)) return true;

    // Owner siempre tiene todos los permisos
    return this.isOwner(userId, companyId);
  }

  private mapCompany(data: any): Company {
    return {
      id: data.id,
      ownerUserId: data.owner_user_id,
      name: data.name,
      type: data.type,
      description: data.description,
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      settings: data.settings || {},
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapCompanyUser(data: any): CompanyUser {
    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      role: data.role,
      permissions: data.permissions || {},
      isActive: data.is_active,
      invitedBy: data.invited_by,
      invitedAt: data.invited_at ? new Date(data.invited_at) : undefined,
      joinedAt: new Date(data.joined_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

