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
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, MoveDealStageDto, DealResponseDto, PipelineStatsDto, DealStage } from './dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo deal' })
  @ApiResponse({ status: 201, description: 'Deal creado exitosamente', type: DealResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() createDto: CreateDealDto,
    @Request() req: any,
  ): Promise<DealResponseDto> {
    const userId = req.user.sub;
    return this.dealsService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar deals' })
  @ApiQuery({ name: 'myCompanyId', required: true, description: 'ID de la empresa' })
  @ApiQuery({ name: 'stage', required: false, enum: DealStage, description: 'Filtrar por etapa' })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filtrar por cliente' })
  @ApiResponse({ status: 200, description: 'Lista de deals', type: [DealResponseDto] })
  async findAll(
    @Query('myCompanyId') myCompanyId: string,
    @Query('stage') stage?: DealStage,
    @Query('clientId') clientId?: string,
  ): Promise<DealResponseDto[]> {
    return this.dealsService.findAll(myCompanyId, stage, clientId);
  }

  @Get('pipeline-stats/:myCompanyId')
  @ApiOperation({ summary: 'Obtener estadísticas del pipeline de ventas' })
  @ApiResponse({ status: 200, description: 'Estadísticas por etapa', type: [PipelineStatsDto] })
  async getPipelineStats(@Param('myCompanyId') myCompanyId: string): Promise<PipelineStatsDto[]> {
    return this.dealsService.getPipelineStats(myCompanyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un deal por ID' })
  @ApiResponse({ status: 200, description: 'Deal encontrado', type: DealResponseDto })
  @ApiResponse({ status: 404, description: 'Deal no encontrado' })
  async findOne(@Param('id') id: string): Promise<DealResponseDto> {
    return this.dealsService.findOne(id);
  }

  @Post(':id/move-stage')
  @ApiOperation({ summary: 'Mover deal a otra etapa del pipeline' })
  @ApiResponse({ status: 200, description: 'Deal movido exitosamente', type: DealResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o razón requerida' })
  async moveToStage(
    @Param('id') id: string,
    @Body() moveDto: MoveDealStageDto,
  ): Promise<DealResponseDto> {
    return this.dealsService.moveToStage(id, moveDto);
  }

  @Post(':id/create-project')
  @ApiOperation({ summary: 'Crear proyecto desde deal ganado' })
  @ApiResponse({ status: 201, description: 'Proyecto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Deal no está en estado CLOSED_WON' })
  async createProjectFromDeal(
    @Param('id') id: string,
    @Body() body: { projectName?: string; projectDescription?: string },
  ): Promise<{ projectId: string }> {
    const projectId = await this.dealsService.createProjectFromDeal(
      id,
      body.projectName,
      body.projectDescription,
    );
    return { projectId };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un deal' })
  @ApiResponse({ status: 200, description: 'Deal actualizado', type: DealResponseDto })
  @ApiResponse({ status: 404, description: 'Deal no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDealDto,
  ): Promise<DealResponseDto> {
    return this.dealsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un deal' })
  @ApiResponse({ status: 200, description: 'Deal eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Deal no encontrado' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.dealsService.remove(id);
    return { message: 'Deal deleted successfully' };
  }
}
