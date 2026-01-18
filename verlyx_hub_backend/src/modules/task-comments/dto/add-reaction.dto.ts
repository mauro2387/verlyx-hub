import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReactionDto {
  @ApiProperty({ description: 'Emoji de la reacción', example: '👍' })
  @IsString()
  emoji: string;

  @ApiProperty({ description: 'ID del usuario que reacciona' })
  @IsUUID()
  userId: string;
}
