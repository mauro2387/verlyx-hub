import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage, DealPriority } from './create-deal.dto';

export class DealResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  myCompanyId: string;

  @ApiProperty()
  clientId: string;

  @ApiPropertyOptional()
  organizationId?: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: DealStage })
  stage: DealStage;

  @ApiProperty({ enum: DealPriority })
  priority: DealPriority;

  @ApiPropertyOptional()
  amount?: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  probability?: number;

  @ApiPropertyOptional()
  expectedRevenue?: number;

  @ApiPropertyOptional()
  expectedCloseDate?: Date;

  @ApiPropertyOptional()
  actualCloseDate?: Date;

  @ApiPropertyOptional()
  lostDate?: Date;

  @ApiPropertyOptional()
  lostReason?: string;

  @ApiPropertyOptional()
  wonReason?: string;

  @ApiPropertyOptional()
  ownerUserId?: string;

  @ApiPropertyOptional({ type: [String] })
  assignedUsers?: string[];

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  sourceDetails?: string;

  @ApiPropertyOptional()
  primaryContactId?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional()
  customFields?: Record<string, any>;

  @ApiProperty()
  stageChangedAt: Date;

  @ApiProperty()
  daysInStage: number;

  @ApiPropertyOptional()
  nextAction?: string;

  @ApiPropertyOptional()
  nextActionDate?: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;
}
