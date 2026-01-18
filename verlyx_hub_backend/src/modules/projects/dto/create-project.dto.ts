import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsDateString, 
  IsUUID, 
  IsNumber,
  Min,
  Max,
  IsArray
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ProjectStatus {
  BACKLOG = 'backlog',
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  REVIEW = 'review',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateProjectDto {
  @ApiPropertyOptional({ description: 'My Company ID (which of your companies this project is for)' })
  @IsUUID()
  @IsOptional()
  myCompanyId?: string;

  @ApiPropertyOptional({ description: 'Client Company ID (which client company this project is for)' })
  @IsUUID()
  @IsOptional()
  clientCompanyId?: string;

  @ApiPropertyOptional({ description: 'Company ID (deprecated - use myCompanyId or clientCompanyId)' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Detailed project description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    enum: ProjectStatus, 
    default: ProjectStatus.BACKLOG,
    description: 'Project status'
  })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiProperty({ 
    enum: ProjectPriority, 
    default: ProjectPriority.MEDIUM,
    description: 'Project priority level'
  })
  @IsEnum(ProjectPriority)
  @IsOptional()
  priority?: ProjectPriority;

  @ApiPropertyOptional({ description: 'Budget amount (USD)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional({ description: 'Amount spent so far' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  spentAmount?: number;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Project start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Project due date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Project completion date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  completionDate?: string;

  @ApiPropertyOptional({ description: 'Progress percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  progressPercentage?: number;

  @ApiPropertyOptional({ description: 'Client ID (from CRM)' })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Client Organization ID' })
  @IsUUID()
  @IsOptional()
  clientOrganizationId?: string;

  @ApiPropertyOptional({ description: 'Deal ID (if linked to a deal)' })
  @IsUUID()
  @IsOptional()
  dealId?: string;

  @ApiPropertyOptional({ description: 'Project Manager user ID' })
  @IsUUID()
  @IsOptional()
  projectManagerId?: string;

  @ApiPropertyOptional({ description: 'Project tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom fields (JSON object)' })
  @IsOptional()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Archive status', default: false })
  @IsOptional()
  isArchived?: boolean;
}
