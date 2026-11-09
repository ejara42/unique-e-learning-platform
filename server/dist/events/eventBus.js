"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = exports.EnterpriseEventBus = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const models_1 = require("../models");
const mongoConnection_1 = require("../data/mongoConnection");
class EnterpriseEventBus {
    emitter = new events_1.EventEmitter();
    subscribersCount = 0;
    constructor() {
        this.emitter.setMaxListeners(100);
    }
    subscribe(eventType, handler) {
        this.subscribersCount++;
        this.emitter.on(eventType, async (event) => {
            try {
                await handler(event);
            }
            catch (err) {
                console.error(`[EventBus Handler Failure] Event: ${eventType} (${event.eventId})`, err?.message || err);
            }
        });
    }
    async publish(eventType, aggregateId, payload) {
        const event = {
            eventId: `evt-${(0, uuid_1.v4)()}`,
            type: eventType,
            timestamp: new Date().toISOString(),
            aggregateId,
            payload,
        };
        // 1. Transactional Outbox persistence for durable auditing
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                await models_1.OutboxEventModel.create({
                    id: event.eventId,
                    eventType,
                    aggregateId,
                    payload,
                    status: 'DISPATCHED',
                    dispatchedAt: new Date(),
                });
            }
            catch (dbErr) {
                console.warn(`[EventBus] Outbox write notice: ${dbErr?.message}`);
            }
        }
        // 2. Asynchronous dispatch (decoupled from the calling HTTP thread)
        setImmediate(() => {
            this.emitter.emit(eventType, event);
        });
        return event;
    }
    getSubscriberCount() {
        return this.subscribersCount;
    }
}
exports.EnterpriseEventBus = EnterpriseEventBus;
exports.eventBus = new EnterpriseEventBus();
