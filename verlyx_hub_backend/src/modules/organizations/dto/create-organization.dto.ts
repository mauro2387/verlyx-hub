import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum, IsInt, IsLatitude, IsLongitude, IsArray, IsObject, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrganizationType {
  HEADQUARTERS = 'HEADQUARTERS',
  BRANCH = 'BRANCH',
  OFFICE = 'OFFICE',
  STORE = 'STORE',
  WAREHOUSE = 'WAREHOUSE',
  FACTORY = 'FACTORY',
  DISTRIBUTION_CENTER = 'DISTRIBUTION_CENTER',
  SALES_POINT = 'SALES_POINT',
  SERVICE_CENTER = 'SERVICE_CENTER',
  OTHER = 'OTHER',
}

export class CreateOrganizationDto {
  @ApiProperty({ description: 'ID de la empresa (my_company) dueña' })
  @IsNotEmpty()
  @IsUUID()
  myCompanyId: string;

  @ApiProperty({ description: 'ID del cliente (company)' })
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ description: 'ID de la organización padre (para jerarquía)' })
  @IsOptional()
  @IsUUID()
  parentOrganizationId?: string;

  @ApiProperty({ description: 'Nombre de la organización' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Código único de la organización' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ enum: OrganizationType, default: OrganizationType.BRANCH })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  // Ubicación
  @ApiPropertyOptional({ description: 'Dirección completa' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ciudad' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Estado/Provincia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'País' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Código postal' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Latitud' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitud' })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  // Contacto
  @ApiPropertyOptional({ description: 'Teléfono principal' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email de contacto' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Sitio web' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  // Detalles
  @ApiPropertyOptional({ description: 'Número de empleados' })
  @IsOptional()
  @IsInt()
  @Min(0)
  employeesCount?: number;

  @ApiPropertyOptional({ description: 'Tamaño en m²' })
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ description: 'Horario de atención' })
  @IsOptional()
  @IsString()
  businessHours?: string;

  @ApiPropertyOptional({ description: 'Zona horaria' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  // Contacto principal
  @ApiPropertyOptional({ description: 'Nombre del contacto principal' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactName?: string;

  @ApiPropertyOptional({ description: 'Email del contacto principal' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactEmail?: string;

  @ApiPropertyOptional({ description: 'Teléfono del contacto principal' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryContactPhone?: string;

  // Metadata
  @ApiPropertyOptional({ description: 'Etiquetas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Campos personalizados' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Estado activo', default: true })
  @IsOptional()
  isActive?: boolean;
}
