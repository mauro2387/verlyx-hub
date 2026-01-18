import { PartialType } from '@nestjs/swagger';
import { CreateWorkspacePageDto } from './create-workspace-page.dto';

export class UpdateWorkspacePageDto extends PartialType(CreateWorkspacePageDto) {}
