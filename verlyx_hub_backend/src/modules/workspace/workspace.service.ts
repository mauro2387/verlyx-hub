import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Injectable()
export class WorkspaceService {
  constructor(private supabaseService: SupabaseService) {}

  // ==================== WORKSPACES ====================
  
  async createWorkspace(createDto: CreateWorkspaceDto, userId: string | null) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('workspaces')
      .insert({
        my_company_id: createDto.myCompanyId,
        name: createDto.name,
        description: createDto.description,
        icon: createDto.icon,
        color: createDto.color,
        is_public: createDto.isPublic || false,
        default_page_template: createDto.defaultPageTemplate,
        order: createDto.order || 0,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkspaces(myCompanyId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('workspaces')
      .select('*')
      .eq('my_company_id', myCompanyId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getWorkspace(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Workspace no encontrado');
    return data;
  }

  async updateWorkspace(id: string, updateDto: UpdateWorkspaceDto) {
    const { data, error} = await this.supabaseService
      .getClient()
      .from('workspaces')
      .update({
        name: updateDto.name,
        description: updateDto.description,
        icon: updateDto.icon,
        color: updateDto.color,
        is_public: updateDto.isPublic,
        default_page_template: updateDto.defaultPageTemplate,
        order: updateDto.order,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWorkspace(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Workspace eliminado' };
  }

  // ==================== PAGES ====================

  async createPage(createDto: CreatePageDto, userId: string | null) {
    console.log('📝 Creating page:', { workspaceId: createDto.workspaceId, title: createDto.title, userId });
    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pages')
      .insert({
        workspace_id: createDto.workspaceId,
        parent_page_id: createDto.parentPageId,
        title: createDto.title,
        icon: createDto.icon,
        cover_url: createDto.coverUrl,
        is_public: createDto.isPublic || false,
        is_template: createDto.isTemplate || false,
        template_type: createDto.templateType,
        can_comment: createDto.canComment !== false,
        can_edit_by_others: createDto.canEditByOthers || false,
        created_by: userId,
        last_edited_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating page:', error);
      throw error;
    }
    console.log('✅ Page created:', data.id);
    return data;
  }

  async getPages(workspaceId: string, parentPageId?: string) {
    console.log('📖📖📖 GETTING PAGES - NEW CODE:', { workspaceId, parentPageId });
    
    let query = this.supabaseService
      .getClient()
      .from('pages')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (parentPageId) {
      query = query.eq('parent_page_id', parentPageId);
    } else {
      query = query.is('parent_page_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error getting pages:', error);
      throw error;
    }
    console.log(`✅ Found ${data.length} pages`);
    return data;
  }

  async getPage(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pages')
      .select('*, blocks(*)')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Página no encontrada');
    return data;
  }

  async updatePage(id: string, updateDto: UpdatePageDto, userId: string | null) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('pages')
      .update({
        title: updateDto.title,
        icon: updateDto.icon,
        cover_url: updateDto.coverUrl,
        is_public: updateDto.isPublic,
        is_template: updateDto.isTemplate,
        template_type: updateDto.templateType,
        can_comment: updateDto.canComment,
        can_edit_by_others: updateDto.canEditByOthers,
        last_edited_by: userId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePage(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('pages')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Página eliminada' };
  }

  async duplicatePage(id: string, newTitle?: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('duplicate_page', {
        source_page_id: id,
        new_title: newTitle,
      });

    if (error) throw error;
    return { newPageId: data };
  }

  // ==================== BLOCKS ====================

  async createBlock(createDto: CreateBlockDto, userId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('blocks')
      .insert({
        page_id: createDto.pageId,
        parent_block_id: createDto.parentBlockId,
        type: createDto.type,
        content: createDto.content,
        order: createDto.order || 0,
        indent_level: createDto.indentLevel || 0,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getBlocks(pageId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('blocks')
      .select('*')
      .eq('page_id', pageId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateBlock(id: string, updateDto: UpdateBlockDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('blocks')
      .update({
        type: updateDto.type,
        content: updateDto.content,
        order: updateDto.order,
        indent_level: updateDto.indentLevel,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBlock(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Bloque eliminado' };
  }

  async reorderBlocks(pageId: string, blockOrders: { id: string; order: number }[]) {
    const promises = blockOrders.map(({ id, order }) =>
      this.supabaseService
        .getClient()
        .from('blocks')
        .update({ order })
        .eq('id', id)
        .eq('page_id', pageId)
    );

    await Promise.all(promises);
    return { message: 'Bloques reordenados' };
  }
}
