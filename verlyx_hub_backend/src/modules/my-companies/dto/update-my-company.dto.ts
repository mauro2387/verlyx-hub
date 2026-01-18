import { PartialType } from '@nestjs/mapped-types';
import { CreateMyCompanyDto } from './create-my-company.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMyCompanyDto extends PartialType(CreateMyCompanyDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
