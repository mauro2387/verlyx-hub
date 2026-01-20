import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva organización de cliente' })
  @ApiResponse({ status: 201, description: 'Organización creada exitosamente', type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() createDto: CreateOrganizationDto,
    @Request() req: any,
  ): Promise<OrganizationResponseDto> {
    const userId = req.user.sub;
    return this.organizationsService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar organizaciones' })
  @ApiQuery({ name: 'myCompanyId', required: true, description: 'ID de la empresa' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filtrar por cliente' })
  @ApiResponse({ status: 200, description: 'Lista de organizaciones', type: [OrganizationResponseDto] })
  async findAll(
    @Query('myCompanyId') myCompanyId: string,
    @Query('clientId') clientId?: string,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAll(myCompanyId, clientId);
  }

  @Get('hierarchy/:clientId')
  @ApiOperation({ summary: 'Obtener jerarquía completa de organizaciones de un cliente' })
  @ApiResponse({ status: 200, description: 'Árbol jerárquico de organizaciones', type: [OrganizationResponseDto] })
  async getHierarchy(@Param('clientId') clientId: string): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.getHierarchy(clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una organización por ID' })
  @ApiResponse({ status: 200, description: 'Organización encontrada', type: OrganizationResponseDto })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async findOne(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una organización' })
  @ApiResponse({ status: 200, description: 'Organización actualizada', type: OrganizationResponseDto })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una organización' })
  @ApiResponse({ status: 200, description: 'Organización eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.organizationsService.remove(id);
    return { message: 'Organization deleted successfully' };
  }
}
