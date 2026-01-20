import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsNumber, IsInt, IsBoolean, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateTaskDto {
  @ApiProperty({ description: 'ID de la empresa (my_company)' })
  @IsUUID()
  myCompanyId: string;

  @ApiPropertyOptional({ description: 'ID del proyecto' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'ID del deal' })
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional({ description: 'ID del cliente' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'ID de la organización del cliente' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'ID de la tarea padre (para subtareas)' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiProperty({ description: 'Título de la tarea' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'ID del usuario asignado principal' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Array de IDs de usuarios asignados', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignedUsers?: string[];

  @ApiPropertyOptional({ description: 'Fecha de inicio' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : null)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : null)
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Horas estimadas' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Horas reales', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de progreso (0-100)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiPropertyOptional({ description: 'Está bloqueada', default: false })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({ description: 'Razón del bloqueo' })
  @IsOptional()
  @IsString()
  blockedReason?: string;

  @ApiPropertyOptional({ description: 'Etiquetas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Campos personalizados' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Archivos adjuntos' })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Checklist embebida' })
  @IsOptional()
  @IsArray()
  checklist?: any[];
}
