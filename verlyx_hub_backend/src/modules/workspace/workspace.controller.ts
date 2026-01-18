import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
// import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
// import { RolesGuard } from '@/common/guards/roles.guard';
// import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Workspace')
@Controller('workspace')
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // ==========================================
  // WORKSPACES ENDPOINTS
  // ==========================================

  @Post()
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Create new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  createWorkspace(@Body() createWorkspaceDto: CreateWorkspaceDto, @Request() req) {
    const userId = req.user?.id || null;
    return this.workspaceService.createWorkspace(createWorkspaceDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for company' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  getWorkspaces(@Query('myCompanyId') myCompanyId: string) {
    return this.workspaceService.getWorkspaces(myCompanyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  getWorkspace(@Param('id') id: string) {
    return this.workspaceService.getWorkspace(id);
  }

  @Patch(':id')
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  updateWorkspace(@Param('id') id: string, @Body() updateWorkspaceDto: UpdateWorkspaceDto) {
    return this.workspaceService.updateWorkspace(id, updateWorkspaceDto);
  }

  @Delete(':id')
  // @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  deleteWorkspace(@Param('id') id: string) {
    return this.workspaceService.deleteWorkspace(id);
  }

  // ==========================================
  // PAGES ENDPOINTS
  // ==========================================

  @Post('pages')
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Create new page' })
  @ApiResponse({ status: 201, description: 'Page created successfully' })
  createPage(@Body() createPageDto: CreatePageDto, @Request() req) {
    const userId = req.user?.id || null;
    return this.workspaceService.createPage(createPageDto, userId);
  }

  @Get('pages')
  @ApiOperation({ summary: 'Get pages for workspace' })
  @ApiResponse({ status: 200, description: 'List of pages' })
  getPages(
    @Query('workspaceId') workspaceId: string,
    @Query('parentPageId') parentPageId?: string,
  ) {
    return this.workspaceService.getPages(workspaceId, parentPageId);
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get page by ID with blocks' })
  @ApiResponse({ status: 200, description: 'Page details with blocks' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  getPage(@Param('id') id: string) {
    return this.workspaceService.getPage(id);
  }

  @Patch('pages/:id')
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Update page' })
  @ApiResponse({ status: 200, description: 'Page updated successfully' })
  updatePage(@Param('id') id: string, @Body() updatePageDto: UpdatePageDto, @Request() req) {
    const userId = req.user?.id || null;
    return this.workspaceService.updatePage(id, updatePageDto, userId);
  }

  @Delete('pages/:id')
  // @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete page' })
  @ApiResponse({ status: 200, description: 'Page deleted successfully' })
  deletePage(@Param('id') id: string) {
    return this.workspaceService.deletePage(id);
  }

  @Post('pages/:id/duplicate')
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Duplicate page with all blocks' })
  @ApiResponse({ status: 201, description: 'Page duplicated successfully' })
  duplicatePage(@Param('id') id: string, @Body() body: { newTitle?: string }) {
    return this.workspaceService.duplicatePage(id, body.newTitle);
  }

  // ==========================================
  // BLOCKS ENDPOINTS
  // ==========================================

  @Post('blocks')
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Create new block' })
  @ApiResponse({ status: 201, description: 'Block created successfully' })
  createBlock(@Body() createBlockDto: CreateBlockDto, @Request() req) {
    return this.workspaceService.createBlock(createBlockDto, req.user.id);
  }

  @Get('blocks')
  @ApiOperation({ summary: 'Get blocks for page' })
  @ApiResponse({ status: 200, description: 'List of blocks' })
  getBlocks(@Query('pageId') pageId: string) {
    return this.workspaceService.getBlocks(pageId);
  }

  @Patch('blocks/:id')
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Update block' })
  @ApiResponse({ status: 200, description: 'Block updated successfully' })
  updateBlock(@Param('id') id: string, @Body() updateBlockDto: UpdateBlockDto) {
    return this.workspaceService.updateBlock(id, updateBlockDto);
  }

  @Delete('blocks/:id')
  // @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete block' })
  @ApiResponse({ status: 200, description: 'Block deleted successfully' })
  deleteBlock(@Param('id') id: string) {
    return this.workspaceService.deleteBlock(id);
  }

  @Post('blocks/reorder')
  // @Roles('owner', 'admin', 'user')
  @ApiOperation({ summary: 'Reorder blocks on page' })
  @ApiResponse({ status: 200, description: 'Blocks reordered successfully' })
  reorderBlocks(
    @Body() body: { pageId: string; blockOrders: Array<{ id: string; order: number }> },
  ) {
    return this.workspaceService.reorderBlocks(body.pageId, body.blockOrders);
  }
}
