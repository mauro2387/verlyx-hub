import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage } from './create-deal.dto';

export class MoveDealStageDto {
  @ApiProperty({ enum: DealStage, description: 'Nueva etapa del deal' })
  @IsNotEmpty()
  @IsEnum(DealStage)
  newStage: DealStage;

  @ApiPropertyOptional({ description: 'Razón del cambio (requerido para CLOSED_WON/CLOSED_LOST)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
