import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTaskCommentDto } from './create-task-comment.dto';

export class UpdateTaskCommentDto extends PartialType(
  OmitType(CreateTaskCommentDto, ['taskId', 'myCompanyId', 'parentCommentId'] as const)
) {}
