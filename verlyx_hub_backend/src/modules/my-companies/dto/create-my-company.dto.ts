import { IsString, IsOptional, IsHexColor, MaxLength, IsIn } from 'class-validator';

const VALID_TYPES = [
  'technology',
  'consulting',
  'retail',
  'services',
  'education',
  'health',
  'finance',
  'manufacturing',
  'real_estate',
  'marketing',
  'design',
  'legal',
  'other',
] as const;

export class CreateMyCompanyDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsIn(VALID_TYPES)
  type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
