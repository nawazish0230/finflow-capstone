import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, type EachMessagePayload } from 'kafkajs';
import { ChatbotService } from '../../modules/chatbot/chatbot.service';
import { ConfigService } from '@nestjs/config';
import { TransactionCreatedEvent } from '../../events/transaction-created.event';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly kafka: Kafka;
  private readonly topic: string;
  private readonly groupId = 'chatbot-transactions-consumer';

  constructor(
    private readonly config: ConfigService,
    private readonly chatbotService: ChatbotService,
  ) {
    const brokers = this.config.get<string[]>('kafka.brokers') ?? [
      'localhost:9092',
    ];
    const clientId =
      this.config.get<string>('kafka.clientId') ?? 'chatbot-service';
    this.kafka = new Kafka({ clientId, brokers });
    this.topic = this.config.get<string>('kafka.transactionsTopic') ?? 'transactions.created';
  }

  private consumer: import('kafkajs').Consumer;

  async onModuleInit(): Promise<void> {
    this.consumer = this.kafka.consumer({ groupId: this.groupId });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        console.log('chatbot kafka consumer message', message);
        if (!message.value) return;
        try {
          const event: TransactionCreatedEvent = JSON.parse(
            message.value.toString(),
          );
          await this.chatbotService.upsertTransactionFromEvent(event);
        } catch (error) {
          this.logger.error('Failed to process Kafka message', error as Error);
        }
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}
