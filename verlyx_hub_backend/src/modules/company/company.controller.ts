import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompanyId } from '../../common/decorators/company.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * POST /api/companies
   * Crear nueva empresa
   */
  @Post()
  async create(@Request() req, @Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(req.user.sub, createCompanyDto);
  }

  /**
   * GET /api/companies
   * Listar empresas del usuario
   */
  @Get()
  async findAll(@Request() req) {
    return this.companyService.findAllByUser(req.user.sub);
  }

  /**
   * GET /api/companies/:id
   * Obtener empresa por ID
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.companyService.findOne(req.user.sub, id);
  }

  /**
   * PATCH /api/companies/:id
   * Actualizar empresa (solo OWNER)
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyService.update(req.user.sub, id, updateCompanyDto);
  }

  /**
   * DELETE /api/companies/:id
   * Eliminar empresa (solo OWNER)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async remove(@Request() req, @Param('id') id: string) {
    await this.companyService.remove(req.user.sub, id);
    return { message: 'Empresa eliminada' };
  }

  /**
   * GET /api/companies/:id/members
   * Obtener miembros de la empresa
   */
  @Get(':id/members')
  async getMembers(@Request() req, @Param('id') id: string) {
    return this.companyService.getMembers(req.user.sub, id);
  }

  /**
   * POST /api/companies/:id/members
   * Invitar usuario a empresa (OWNER o ADMIN)
   */
  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async inviteMember(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { userId: string; role: string },
  ) {
    return this.companyService.inviteMember(
      req.user.sub,
      id,
      body.userId,
      body.role,
    );
  }

  /**
   * PATCH /api/companies/:id/members/:memberId
   * Actualizar rol de miembro (OWNER o ADMIN)
   */
  @Patch(':id/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async updateMemberRole(
    @Request() req,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: string },
  ) {
    return this.companyService.updateMemberRole(
      req.user.sub,
      id,
      memberId,
      body.role,
    );
  }

  /**
   * DELETE /api/companies/:id/members/:memberId
   * Remover miembro de empresa (OWNER o ADMIN)
   */
  @Delete(':id/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async removeMember(
    @Request() req,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    await this.companyService.removeMember(req.user.sub, id, memberId);
    return { message: 'Miembro removido' };
  }
}
