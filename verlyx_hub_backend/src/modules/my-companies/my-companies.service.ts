import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateMyCompanyDto } from './dto/create-my-company.dto';
import { UpdateMyCompanyDto } from './dto/update-my-company.dto';
import { MyCompany } from './entities/my-company.entity';

@Injectable()
export class MyCompaniesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, createDto: CreateMyCompanyDto): Promise<MyCompany> {
    const { data, error } = await this.supabase.getClient()
      .from('my_companies')
      .insert({
        owner_user_id: userId,
        name: createDto.name,
        type: createDto.type,
        description: createDto.description,
        logo_url: createDto.logoUrl,
        primary_color: createDto.primaryColor || '#6366f1',
        secondary_color: createDto.secondaryColor || '#8b5cf6',
        tax_id: createDto.taxId,
        industry: createDto.industry,
        website: createDto.website,
        phone: createDto.phone,
        email: createDto.email,
        address: createDto.address,
        city: createDto.city,
        country: createDto.country || 'Uruguay',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapMyCompany(data);
  }

  async findAllByUser(userId: string): Promise<MyCompany[]> {
    const { data, error } = await this.supabase.getClient()
      .from('my_companies')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapMyCompany);
  }

  async findOne(userId: string, companyId: string): Promise<MyCompany> {
    const { data, error } = await this.supabase.getClient()
      .from('my_companies')
      .select('*')
      .eq('id', companyId)
      .eq('owner_user_id', userId)
      .single();

    if (error) throw new NotFoundException('Empresa no encontrada');

    return this.mapMyCompany(data);
  }

  async update(
    userId: string,
    companyId: string,
    updateDto: UpdateMyCompanyDto,
  ): Promise<MyCompany> {
    const updateData: any = {};
    if (updateDto.name) updateData.name = updateDto.name;
    if (updateDto.type) updateData.type = updateDto.type;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.logoUrl !== undefined) updateData.logo_url = updateDto.logoUrl;
    if (updateDto.primaryColor) updateData.primary_color = updateDto.primaryColor;
    if (updateDto.secondaryColor) updateData.secondary_color = updateDto.secondaryColor;
    if (updateDto.taxId !== undefined) updateData.tax_id = updateDto.taxId;
    if (updateDto.industry !== undefined) updateData.industry = updateDto.industry;
    if (updateDto.website !== undefined) updateData.website = updateDto.website;
    if (updateDto.phone !== undefined) updateData.phone = updateDto.phone;
    if (updateDto.email !== undefined) updateData.email = updateDto.email;
    if (updateDto.address !== undefined) updateData.address = updateDto.address;
    if (updateDto.city !== undefined) updateData.city = updateDto.city;
    if (updateDto.country !== undefined) updateData.country = updateDto.country;
    if (updateDto.isActive !== undefined) updateData.is_active = updateDto.isActive;

    const { data, error } = await this.supabase.getClient()
      .from('my_companies')
      .update(updateData)
      .eq('id', companyId)
      .eq('owner_user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return this.mapMyCompany(data);
  }

  async remove(userId: string, companyId: string): Promise<void> {
    const { error } = await this.supabase.getClient()
      .from('my_companies')
      .delete()
      .eq('id', companyId)
      .eq('owner_user_id', userId);

    if (error) throw error;
  }

  private mapMyCompany(data: any): MyCompany {
    return {
      id: data.id,
      ownerUserId: data.owner_user_id,
      name: data.name,
      type: data.type,
      description: data.description,
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      taxId: data.tax_id,
      industry: data.industry,
      website: data.website,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      settings: data.settings || {},
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
