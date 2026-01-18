import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType } from './create-organization.dto';

export class OrganizationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  myCompanyId: string;

  @ApiProperty()
  clientId: string;

  @ApiPropertyOptional()
  parentOrganizationId?: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  code?: string;

  @ApiProperty({ enum: OrganizationType })
  type: OrganizationType;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  postalCode?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  employeesCount?: number;

  @ApiPropertyOptional()
  size?: number;

  @ApiPropertyOptional()
  businessHours?: string;

  @ApiPropertyOptional()
  timezone?: string;

  @ApiPropertyOptional()
  primaryContactName?: string;

  @ApiPropertyOptional()
  primaryContactEmail?: string;

  @ApiPropertyOptional()
  primaryContactPhone?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional()
  customFields?: Record<string, any>;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;

  // Campos opcionales de jerarquía (cuando se consulta con get_organization_hierarchy)
  @ApiPropertyOptional()
  level?: number;

  @ApiPropertyOptional()
  path?: string[];

  @ApiPropertyOptional({ type: [OrganizationResponseDto] })
  children?: OrganizationResponseDto[];
}
