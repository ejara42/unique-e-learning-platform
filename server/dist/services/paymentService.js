"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = exports.PaymentService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const models_1 = require("../models");
const mongoConnection_1 = require("../data/mongoConnection");
class PaymentService {
    stripe;
    webhookSecret;
    constructor() {
        const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
        if (process.env.NODE_ENV === 'production') {
            if (!apiKey) {
                throw new Error('[FATAL] STRIPE_SECRET_KEY must be configured in production mode.');
            }
            if (!webhookSecret) {
                throw new Error('[FATAL] STRIPE_WEBHOOK_SECRET must be configured in production mode.');
            }
        }
        this.stripe = new stripe_1.default(apiKey || 'sk_test_edusphere_local_tests_only', {
            apiVersion: '2025-01-27.acacia',
        });
        this.webhookSecret = webhookSecret || 'whsec_local_tests_only';
    }
    /**
     * Creates a Stripe Checkout Session with dynamic split payouts (15% platform / 85% instructor)
     * Uses a real Stripe Checkout Session. Test/live behavior is determined by Stripe credentials.
     */
    async createCheckoutSession(options) {
        const { courseId, learnerId, learnerEmail, successUrl, cancelUrl } = options;
        const course = await dbRepository_1.repo.getCourseById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }
        if (!course.isPublished)
            throw new Error('Course is not available for purchase');
        if (!Number.isFinite(course.price) || course.price <= 0) {
            throw new Error('Only paid courses can be checked out');
        }
        const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
        if (!apiKey || apiKey === 'sk_test_edusphere_local_tests_only') {
            throw new Error('A real STRIPE_SECRET_KEY must be configured before checkout.');
        }
        const priceAmount = Math.round(course.price * 100);
        const commissionPct = process.env.STRIPE_COMMISSION_PCT
            ? Math.min(Math.max(parseFloat(process.env.STRIPE_COMMISSION_PCT) / 100, 0.01), 0.50)
            : 0.15; // Default 15% platform commission
        const platformFee = Math.round(priceAmount * commissionPct); // platform commission
        const instructorPayout = priceAmount - platformFee; // instructor payout
        const stripeSession = await this.stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: learnerEmail,
            client_reference_id: learnerId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            line_items: [{
                    quantity: 1,
                    price_data: {
                        currency: 'usd',
                        unit_amount: priceAmount,
                        product_data: {
                            name: course.title,
                            description: course.description.slice(0, 500),
                        },
                    },
                }],
            metadata: {
                courseId: course.id,
                learnerId,
            },
        });
        if (!stripeSession.url)
            throw new Error('Stripe did not return a Checkout URL.');
        return {
            sessionId: stripeSession.id,
            paymentUrl: stripeSession.url,
            amount: priceAmount,
            currency: 'usd',
            platformFee,
            instructorPayout,
            status: 'PENDING',
            courseId: course.id,
            learnerId,
        };
    }
    /**
     * Cryptographically verifies incoming Stripe Webhook using the official Stripe SDK
     * with the exact raw request body buffer.
     */
    constructWebhookEvent(rawBody, signatureHeader) {
        if (!signatureHeader) {
            throw new Error('Missing stripe-signature header');
        }
        return this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
    }
    /**
     * Verification helper utilizing the official Stripe SDK constructEvent
     */
    verifyWebhookSignature(payloadRaw, signatureHeader) {
        try {
            this.constructWebhookEvent(typeof payloadRaw === 'string' ? Buffer.from(payloadRaw) : payloadRaw, signatureHeader);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Generates a cryptographically authentic Stripe signature header using official Stripe SDK test utilities
     */
    generateTestWebhookSignature(payloadRaw, secret) {
        return this.stripe.webhooks.generateTestHeaderString({
            payload: typeof payloadRaw === 'string' ? payloadRaw : payloadRaw.toString('utf8'),
            secret: secret || this.webhookSecret,
        });
    }
    /**
     * Atomic Event Idempotency & Failure-Recovery Gate:
     * Prevents concurrent duplicate processing while safely allowing legitimate retries after failures.
     */
    async beginEventProcessing(event) {
        const eventId = event.id;
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB is required to maintain the Stripe webhook idempotency ledger.');
        try {
            const existing = await models_1.ProcessedWebhookEventModel.findOne({ eventId });
            if (existing) {
                if (existing.status === 'COMPLETED') {
                    return { shouldProcess: false, status: 'ALREADY_COMPLETED', reason: 'Event already recorded as COMPLETED in ledger.' };
                }
                if (existing.status === 'PROCESSING') {
                    // Check staleness (if older than 60s, prior process likely crashed; allow recovery)
                    const ageMs = Date.now() - new Date(existing.receivedAt).getTime();
                    if (ageMs < 60000) {
                        return { shouldProcess: false, status: 'IN_FLIGHT', reason: 'Concurrent delivery is already in flight.' };
                    }
                }
                // Status is FAILED or stale PROCESSING: Allow retry and update to PROCESSING
                existing.status = 'PROCESSING';
                existing.receivedAt = new Date().toISOString();
                await existing.save();
                return { shouldProcess: true, status: 'RETRY_ALLOWED', reason: 'Recovering from prior failure or crash on retry.' };
            }
            // New Event insertion
            await models_1.ProcessedWebhookEventModel.create({
                eventId,
                eventType: event.type,
                status: 'PROCESSING',
                receivedAt: new Date().toISOString(),
                payloadSummary: {
                    id: event.id,
                    type: event.type,
                    created: event.created,
                },
            });
        }
        catch (err) {
            if (err.code === 11000) {
                return { shouldProcess: false, status: 'IN_FLIGHT', reason: 'Concurrent event creation conflict handled safely.' };
            }
            throw err;
        }
        return { shouldProcess: true, status: 'NEW' };
    }
    /**
     * Finalize event as COMPLETED in the ledger
     */
    async markEventCompleted(eventId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB is required to maintain the Stripe webhook idempotency ledger.');
        await models_1.ProcessedWebhookEventModel.findOneAndUpdate({ eventId }, { status: 'COMPLETED', processedAt: new Date().toISOString() });
    }
    /**
     * Mark event as FAILED so Stripe retries can safely re-attempt
     */
    async markEventFailed(eventId, errorMessage) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB is required to maintain the Stripe webhook idempotency ledger.');
        await models_1.ProcessedWebhookEventModel.findOneAndUpdate({ eventId }, { status: 'FAILED', errorMessage });
    }
    // Backwards compatibility helper for existing suite
    async registerEventIfNew(event) {
        const decision = await this.beginEventProcessing(event);
        if (decision.shouldProcess) {
            await this.markEventCompleted(event.id);
            return true;
        }
        return false;
    }
    /**
     * Processes verified Stripe checkout.session.completed event (Strictly Idempotent)
     */
    async handleCheckoutCompleted(sessionOrId) {
        let sessionId;
        let courseId;
        let learnerId;
        let amount;
        let platformFee;
        let instructorPayout;
        if (typeof sessionOrId === 'string') {
            throw new Error(`Checkout session object is required to process Stripe session ${sessionOrId}`);
        }
        else {
            sessionId = sessionOrId.id;
            courseId = sessionOrId.metadata?.courseId || sessionOrId.client_reference_id;
            learnerId = sessionOrId.metadata?.learnerId || sessionOrId.client_reference_id;
            amount = sessionOrId.amount_total;
            platformFee = Math.round(amount * 0.15);
            instructorPayout = amount - platformFee;
            if (sessionOrId.payment_status !== 'paid' || !Number.isSafeInteger(amount) || amount <= 0) {
                throw new Error(`Checkout session ${sessionId} is not a paid session with a valid amount.`);
            }
        }
        if (!courseId || !learnerId) {
            throw new Error(`Session ${sessionId} missing required courseId or learnerId`);
        }
        const course = await dbRepository_1.repo.getCourseById(courseId);
        if (!course || !course.isPublished || Math.round(course.price * 100) !== amount) {
            throw new Error(`Checkout session ${sessionId} does not match an available course and its current price.`);
        }
        // Idempotency: Verify if enrollment already exists
        const existing = await dbRepository_1.repo.getEnrollmentsByLearner(learnerId);
        const existingEnrollment = existing.find(e => e.courseId === courseId);
        if (existingEnrollment) {
            return existingEnrollment;
        }
        // Auto-provision enrollment with duplicate resilience
        const newEnrollment = {
            id: `enr-${(0, uuid_1.v4)().slice(0, 8)}`,
            courseId,
            learnerId,
            status: 'ENROLLED',
            enrolledAt: new Date().toISOString(),
            progressPercentage: 0,
            completedLessonIds: [],
        };
        try {
            await dbRepository_1.repo.createEnrollment(newEnrollment);
        }
        catch (err) {
            // E11000 compound index on {courseId, learnerId}
            const concurrentExisting = (await dbRepository_1.repo.getEnrollmentsByLearner(learnerId)).find(e => e.courseId === courseId);
            if (concurrentExisting) {
                return concurrentExisting;
            }
            throw err;
        }
        await dbRepository_1.repo.createAuditLog({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: null,
            actorId: learnerId,
            actorName: learnerId,
            actorRole: 'STUDENT',
            action: 'STRIPE_PAYMENT_ENROLLED',
            resourceType: 'PAYMENT',
            resourceId: sessionId,
            details: `Paid $${amount / 100}. Platform fee: $${platformFee / 100}, Instructor payout: $${instructorPayout / 100}`,
            ipAddress: '127.0.0.1',
            timestamp: new Date().toISOString(),
        });
        return newEnrollment;
    }
}
exports.PaymentService = PaymentService;
exports.paymentService = new PaymentService();
