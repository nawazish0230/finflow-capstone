import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

export class ChatMessageDto {
  message: string;
}

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('ask')
  async ask(@CurrentUser() user: JwtPayload, @Body() body: ChatMessageDto) {
    return this.chatbotService.getInsight(user.sub, body.message ?? '');
  }
}
