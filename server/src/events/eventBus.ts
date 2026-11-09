import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { OutboxEventModel } from '../models';
import { connectionState } from '../data/mongoConnection';

export interface DomainEvent<T = any> {
  eventId: string;
  type: string;
  timestamp: string;
  aggregateId: string;
  payload: T;
}

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

export class EnterpriseEventBus {
  private emitter = new EventEmitter();
  private subscribersCount = 0;

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  public subscribe<T = any>(eventType: string, handler: EventHandler<T>): void {
    this.subscribersCount++;
    this.emitter.on(eventType, async (event: DomainEvent<T>) => {
      try {
        await handler(event);
      } catch (err: any) {
        console.error(`[EventBus Handler Failure] Event: ${eventType} (${event.eventId})`, err?.message || err);
      }
    });
  }

  public async publish<T = any>(eventType: string, aggregateId: string, payload: T): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      eventId: `evt-${uuidv4()}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      aggregateId,
      payload,
    };

    // 1. Transactional Outbox persistence for durable auditing
    if (connectionState.isConnected) {
      try {
        await OutboxEventModel.create({
          id: event.eventId,
          eventType,
          aggregateId,
          payload,
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
        });
      } catch (dbErr: any) {
        console.warn(`[EventBus] Outbox write notice: ${dbErr?.message}`);
      }
    }

    // 2. Asynchronous dispatch (decoupled from the calling HTTP thread)
    setImmediate(() => {
      this.emitter.emit(eventType, event);
    });

    return event;
  }

  public getSubscriberCount(): number {
    return this.subscribersCount;
  }
}

export const eventBus = new EnterpriseEventBus();
