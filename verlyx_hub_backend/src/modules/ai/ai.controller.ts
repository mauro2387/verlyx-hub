import { Controller, Post, Get, Body, Param, Query, Delete, Patch, UseGuards, Request } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ========== CONVERSACIONES ==========
  
  @Post('conversations')
  async createConversation(
    @Request() req,
    @Body('title') title: string,
    @Body('contextType') contextType?: string,
  ) {
    const conversation = await this.aiService.createConversation(
      req.user.sub,
      title,
      contextType,
    );
    return conversation;
  }

  @Get('conversations')
  async getConversations(
    @Request() req,
    @Query('contextType') contextType?: string,
  ) {
    const conversations = await this.aiService.getConversations(
      req.user.sub,
      contextType,
    );
    return conversations;
  }

  @Get('conversations/:id')
  async getConversation(
    @Request() req,
    @Param('id') id: string,
  ) {
    const conversation = await this.aiService.getConversation(req.user.sub, id);
    return conversation;
  }

  @Patch('conversations/:id')
  async updateConversation(
    @Request() req,
    @Param('id') id: string,
    @Body('title') title?: string,
    @Body('isPinned') isPinned?: boolean,
  ) {
    const conversation = await this.aiService.updateConversation(
      req.user.sub,
      id,
      { title, isPinned },
    );
    return conversation;
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Request() req,
    @Param('id') id: string,
  ) {
    await this.aiService.deleteConversation(req.user.sub, id);
    return { message: 'Conversation deleted' };
  }

  // ========== MENSAJES ==========

  @Post('conversations/:id/messages')
  async sendMessage(
    @Request() req,
    @Param('id') conversationId: string,
    @Body('content') content: string,
  ) {
    const response = await this.aiService.sendMessage(
      req.user.sub,
      conversationId,
      content,
    );
    return response;
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('limit') limit?: number,
  ) {
    const messages = await this.aiService.getMessages(
      req.user.sub,
      conversationId,
      limit,
    );
    return messages;
  }

  // ========== ENDPOINTS LEGACY (mantener compatibilidad) ==========

  @Post('chat')
  async chat(
    @Body('message') message: string,
    @Body('context') context?: string,
  ) {
    const response = await this.aiService.chat(message, context);
    return { response };
  }

  @Post('suggest-fields')
  async suggestFields(
    @Body('documentType') documentType: string,
    @Body('existingData') existingData: Record<string, any>,
  ) {
    const suggestions = await this.aiService.suggestFieldValues(
      documentType,
      existingData,
    );
    return { suggestions };
  }

  @Post('analyze-document')
  async analyzeDocument(@Body('documentData') documentData: Record<string, any>) {
    const analysis = await this.aiService.analyzeDocument(documentData);
    return { analysis };
  }

  @Post('generate-project-description')
  async generateProjectDescription(@Body('projectName') projectName: string) {
    const description = await this.aiService.generateProjectDescription(projectName);
    return { description };
  }

  @Post('suggest-tasks')
  async suggestTasks(
    @Body('projectName') projectName: string,
    @Body('projectDescription') projectDescription?: string,
  ) {
    const tasks = await this.aiService.suggestTasks(projectName, projectDescription);
    return { tasks };
  }

  @Post('summarize')
  async summarize(
    @Body('itemType') itemType: string,
    @Body('items') items: any[],
  ) {
    const summary = await this.aiService.summarizeItems(itemType, items);
    return { summary };
  }

  @Post('translate')
  async translate(
    @Body('text') text: string,
    @Body('targetLang') targetLang: string = 'es',
  ) {
    const translation = await this.aiService.detectAndTranslate(text, targetLang);
    return { translation };
  }
}
