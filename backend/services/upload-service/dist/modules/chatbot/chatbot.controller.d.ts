import { ChatbotService } from './chatbot.service';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
export declare class ChatMessageDto {
    message: string;
}
export declare class ChatbotController {
    private readonly chatbotService;
    constructor(chatbotService: ChatbotService);
    ask(user: JwtPayload, body: ChatMessageDto): Promise<{
        answer: string;
    }>;
}
