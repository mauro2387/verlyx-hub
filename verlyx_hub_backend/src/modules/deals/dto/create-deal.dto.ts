import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum, IsNumber, IsInt, IsArray, IsObject, IsBoolean, IsDate, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DealStage {
  LEAD = 'LEAD',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

export enum DealPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateDealDto {
  @ApiProperty({ description: 'ID de la empresa (my_company) dueña' })
  @IsNotEmpty()
  @IsUUID()
  myCompanyId: string;

  @ApiProperty({ description: 'ID del cliente (company)' })
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ description: 'ID de la organización del cliente' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: 'Título del deal' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DealStage, default: DealStage.LEAD })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @ApiPropertyOptional({ enum: DealPriority, default: DealPriority.MEDIUM })
  @IsOptional()
  @IsEnum(DealPriority)
  priority?: DealPriority;

  @ApiPropertyOptional({ description: 'Monto estimado del deal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Moneda', default: 'ARS' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Probabilidad de cierre (0-100)', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ description: 'Fecha estimada de cierre' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedCloseDate?: Date;

  @ApiPropertyOptional({ description: 'ID del responsable del deal' })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @ApiPropertyOptional({ description: 'Array de IDs de usuarios asignados', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignedUsers?: string[];

  @ApiPropertyOptional({ description: 'Origen del lead' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ description: 'Detalles del origen' })
  @IsOptional()
  @IsString()
  sourceDetails?: string;

  @ApiPropertyOptional({ description: 'ID del contacto principal' })
  @IsOptional()
  @IsUUID()
  primaryContactId?: string;

  @ApiPropertyOptional({ description: 'Etiquetas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Campos personalizados' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Próxima acción' })
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional({ description: 'Fecha de próxima acción' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextActionDate?: Date;

  @ApiPropertyOptional({ description: 'Estado activo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
