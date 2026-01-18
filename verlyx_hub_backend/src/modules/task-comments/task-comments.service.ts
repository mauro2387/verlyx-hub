import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { UpdateTaskCommentDto } from './dto/update-task-comment.dto';
import { AddReactionDto } from './dto/add-reaction.dto';

@Injectable()
export class TaskCommentsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createDto: CreateTaskCommentDto, userId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('task_comments')
      .insert({
        task_id: createDto.taskId,
        my_company_id: createDto.myCompanyId,
        content: createDto.content,
        content_html: createDto.contentHtml,
        user_id: userId,
        parent_comment_id: createDto.parentCommentId,
        mentioned_users: createDto.mentionedUsers,
        attachments: createDto.attachments,
        reactions: createDto.reactions || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }

    return this.mapComment(data);
  }

  async findByTask(taskId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_task_comments_with_users', { p_task_id: taskId });

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    return data;
  }

  async findReplies(parentCommentId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_comment_replies', { p_parent_comment_id: parentCommentId });

    if (error) {
      throw new Error(`Failed to fetch replies: ${error.message}`);
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('task_comments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return this.mapComment(data);
  }

  async update(id: string, updateDto: UpdateTaskCommentDto, userId: string) {
    // Verificar que el usuario sea el creador del comentario
    const comment = await this.findOne(id);
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updateData: any = {};
    if (updateDto.content !== undefined) updateData.content = updateDto.content;
    if (updateDto.contentHtml !== undefined) updateData.content_html = updateDto.contentHtml;
    if (updateDto.mentionedUsers !== undefined) updateData.mentioned_users = updateDto.mentionedUsers;
    if (updateDto.attachments !== undefined) updateData.attachments = updateDto.attachments;

    const { data, error } = await this.supabaseService
      .getClient()
      .from('task_comments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }

    return this.mapComment(data);
  }

  async remove(id: string, userId: string) {
    // Verificar que el usuario sea el creador del comentario
    const comment = await this.findOne(id);
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('task_comments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }

    return { message: 'Comment deleted successfully' };
  }

  async addReaction(commentId: string, reactionDto: AddReactionDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('add_comment_reaction', {
        p_comment_id: commentId,
        p_emoji: reactionDto.emoji,
        p_user_id: reactionDto.userId,
      });

    if (error) {
      throw new Error(`Failed to add reaction: ${error.message}`);
    }

    return data;
  }

  async removeReaction(commentId: string, emoji: string, userId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('remove_comment_reaction', {
        p_comment_id: commentId,
        p_emoji: emoji,
        p_user_id: userId,
      });

    if (error) {
      throw new Error(`Failed to remove reaction: ${error.message}`);
    }

    return data;
  }

  private mapComment(data: any) {
    return {
      id: data.id,
      taskId: data.task_id,
      myCompanyId: data.my_company_id,
      content: data.content,
      contentHtml: data.content_html,
      userId: data.user_id,
      parentCommentId: data.parent_comment_id,
      mentionedUsers: data.mentioned_users,
      attachments: data.attachments,
      reactions: data.reactions,
      isEdited: data.is_edited,
      editedAt: data.edited_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
