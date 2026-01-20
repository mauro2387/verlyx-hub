import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MyCompaniesService } from './my-companies.service';
import { CreateMyCompanyDto } from './dto/create-my-company.dto';
import { UpdateMyCompanyDto } from './dto/update-my-company.dto';

@Controller('my-companies')
@UseGuards(JwtAuthGuard)
export class MyCompaniesController {
  constructor(private readonly myCompaniesService: MyCompaniesService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateMyCompanyDto) {
    return this.myCompaniesService.create(req.user.sub, createDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.myCompaniesService.findAllByUser(req.user.sub);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.myCompaniesService.findOne(req.user.sub, id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateMyCompanyDto,
  ) {
    return this.myCompaniesService.update(req.user.sub, id, updateDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.myCompaniesService.remove(req.user.sub, id);
  }
}
