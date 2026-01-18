import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentsDto } from './dto/filter-documents.dto';
import { PaginatedResponse } from '@/common/dto/pagination.dto';

@Injectable()
export class DocumentsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createDocumentDto: CreateDocumentDto, userId: string) {
    const { data, error} = await this.supabaseService
      .getClient()
      .from('documents')
      .insert({
        name: createDocumentDto.name,
        file_path: createDocumentDto.filePath,
        file_size: createDocumentDto.fileSize,
        mime_type: createDocumentDto.mimeType,
        description: createDocumentDto.description,
        project_id: createDocumentDto.projectId,
        tags: createDocumentDto.tags,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }

    return this.mapDocument(data);
  }

  async findAll(filterDto: FilterDocumentsDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, search, projectId } = filterDto;
    const offset = (page - 1) * limit;

    let query = this.supabaseService
      .getClient()
      .from('documents')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return {
      data: data.map((doc) => this.mapDocument(doc)),
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
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.mapDocument(data);
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('documents')
      .update({
        name: updateDocumentDto.name,
        description: updateDocumentDto.description,
        project_id: updateDocumentDto.projectId,
        tags: updateDocumentDto.tags,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }

    return this.mapDocument(data);
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }

    return { message: 'Document deleted successfully' };
  }

  private mapDocument(data: any) {
    return {
      id: data.id,
      name: data.name,
      filePath: data.file_path,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      description: data.description,
      projectId: data.project_id,
      tags: data.tags,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
