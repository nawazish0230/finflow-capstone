import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, type Producer } from 'kafkajs';
import type { TransactionCreatedEvent } from '../../events/transaction-created.event';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly producer: Producer;
  private readonly transactionsTopic: string;

  constructor(private readonly config: ConfigService) {
    const brokers = this.config.get<string[]>('kafka.brokers') ?? ['localhost:9092'];
    const clientId = this.config.get<string>('kafka.clientId') ?? 'upload-service';
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();
    this.transactionsTopic =
      this.config.get<string>('kafka.transactionsTopic') ?? 'transactions.created';
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async publishTransactionsCreated(events: TransactionCreatedEvent[]): Promise<void> {
    if (!events.length) return;
    // console.log('kafka producer events', events);
    await this.producer.send({
      topic: this.transactionsTopic,
      messages: events.map((e) => ({
        key: e.userId,
        value: JSON.stringify(e),
      })),
    });
  }
}

