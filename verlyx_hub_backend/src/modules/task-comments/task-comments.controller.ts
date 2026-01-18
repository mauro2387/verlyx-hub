import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { UpdateTaskCommentDto } from './dto/update-task-comment.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Task Comments')
@Controller('task-comments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @Post()
  @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Create new comment' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  create(@Body() createDto: CreateTaskCommentDto, @Request() req) {
    return this.commentsService.create(createDto, req.user.id);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiResponse({ status: 200, description: 'List of comments with user info' })
  findByTask(@Param('taskId') taskId: string) {
    return this.commentsService.findByTask(taskId);
  }

  @Get('replies/:parentCommentId')
  @ApiOperation({ summary: 'Get replies to a comment (threading)' })
  @ApiResponse({ status: 200, description: 'List of reply comments' })
  findReplies(@Param('parentCommentId') parentCommentId: string) {
    return this.commentsService.findReplies(parentCommentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment details' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Update comment (only own comments)' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  update(
    @Param('id') id: string, 
    @Body() updateDto: UpdateTaskCommentDto,
    @Request() req
  ) {
    return this.commentsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Delete comment (only own comments)' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.id);
  }

  @Post(':id/reactions')
  @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Add emoji reaction to comment' })
  @ApiResponse({ status: 200, description: 'Reaction added' })
  addReaction(
    @Param('id') commentId: string,
    @Body() reactionDto: AddReactionDto,
  ) {
    return this.commentsService.addReaction(commentId, reactionDto);
  }

  @Delete(':id/reactions/:emoji/:userId')
  @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Remove emoji reaction from comment' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  removeReaction(
    @Param('id') commentId: string,
    @Param('emoji') emoji: string,
    @Param('userId') userId: string,
  ) {
    return this.commentsService.removeReaction(commentId, emoji, userId);
  }
}
