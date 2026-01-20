import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Tasks')
@Controller('tasks')
// @UseGuards(JwtAuthGuard, RolesGuard) // TEMPORALMENTE DESHABILITADO PARA TESTING
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filters' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findAll(@Query() filterDto: FilterTasksDto) {
    return this.tasksService.findAll(filterDto);
  }

  @Get('stats/:myCompanyId')
  @ApiOperation({ summary: 'Get tasks statistics by company' })
  @ApiResponse({ status: 200, description: 'Statistics by status with hours' })
  getStats(
    @Param('myCompanyId') myCompanyId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.getStats(myCompanyId, projectId);
  }

  @Get('overdue/:myCompanyId')
  @ApiOperation({ summary: 'Get overdue tasks' })
  @ApiResponse({ status: 200, description: 'List of overdue tasks with days delay' })
  getOverdue(@Param('myCompanyId') myCompanyId: string) {
    return this.tasksService.getOverdue(myCompanyId);
  }

  @Get('hierarchy/:taskId')
  @ApiOperation({ summary: 'Get task hierarchy (subtasks tree)' })
  @ApiResponse({ status: 200, description: 'Task hierarchy with levels' })
  getHierarchy(@Param('taskId') taskId: string) {
    return this.tasksService.getHierarchy(taskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
