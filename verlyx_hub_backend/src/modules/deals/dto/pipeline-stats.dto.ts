import { ApiProperty } from '@nestjs/swagger';
import { DealStage } from './create-deal.dto';

export class PipelineStatsDto {
  @ApiProperty({ enum: DealStage })
  stage: DealStage;

  @ApiProperty()
  count: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  avgAmount: number;

  @ApiProperty()
  totalWeighted: number;
}
