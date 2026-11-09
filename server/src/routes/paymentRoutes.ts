import { Router, Request, Response } from 'express';
import { paymentService } from '../services/paymentService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { eventBus } from '../events/eventBus';
import { validateBody } from '../middleware/validate';
import { paymentCheckoutSchema } from '../validation/schemas';

const router = Router();

function isSafeRedirectUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  try {
    const url = new URL(trimmed);
    const allowedOrigins = (config.corsOrigin || '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);

    if (config.isProduction) {
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      const isAllowedOrigin = allowedOrigins.some(origin => {
        const allowed = new URL(origin);
        return allowed.origin === url.origin;
      });

      if (isLocalhost || isAllowedOrigin) {
        return trimmed;
      }

      return fallback;
    }

    const isAllowedDevOrigin = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'].includes(url.origin);
    if (isAllowedDevOrigin || url.protocol === 'https:' || url.protocol === 'http:') {
      return trimmed;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', requireAuth, validateBody(paymentCheckoutSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, successUrl, cancelUrl } = req.body;

    if (!courseId) {
      res.status(400).json({ message: 'courseId is required' });
      return;
    }

    if (!req.user?.id || !req.user?.email) {
      res.status(401).json({ message: 'Authenticated user profile is missing required identity claims.' });
      return;
    }

    const safeSuccessUrl = isSafeRedirectUrl(successUrl, 'http://localhost:5173/payment-success');
    const safeCancelUrl = isSafeRedirectUrl(cancelUrl, 'http://localhost:5173/payment-cancel');

    const session = await paymentService.createCheckoutSession({
      courseId,
      learnerId: req.user.id,
      learnerEmail: req.user.email,
      successUrl: safeSuccessUrl,
      cancelUrl: safeCancelUrl,
    });

    res.json({
      message: 'Stripe checkout session initialized',
      session,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Payment session creation failed', error: err.message });
  }
});

// POST /api/payments/webhook - Secure listener using official Stripe SDK & raw payload
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = (req as any).rawBody;

  if (!sig) {
    res.status(400).json({ message: 'Missing stripe-signature header' });
    return;
  }

  if (!rawBody) {
    res.status(400).json({ message: 'Raw request body buffer unavailable for cryptographic signature verification' });
    return;
  }

  let event: any;
  try {
    // Official Stripe SDK signature verification
    event = paymentService.constructWebhookEvent(rawBody, sig);
  } catch (err: any) {
    res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
    return;
  }

  // Atomic Idempotency Gate: Prevent double-enrollment or duplicate payout execution
  const decision = await paymentService.beginEventProcessing(event);
  if (!decision.shouldProcess) {
    if (decision.status === 'ALREADY_COMPLETED') {
      res.status(200).json({
        received: true,
        idempotentReplay: true,
        message: `Event ${event.id} already completed. Deduplicated safely.`,
      });
      return;
    }
    // Concurrent delivery in-flight
    res.status(429).json({
      received: false,
      message: 'Concurrent event delivery in flight. Retry later.',
    });
    return;
  }

  // Handle Event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const enrollment = await paymentService.handleCheckoutCompleted(session);
      await paymentService.markEventCompleted(event.id);

      // Async event dispatch to decoupled event bus
      eventBus.publish('COURSE_ENROLLED', enrollment.id, {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        learnerId: enrollment.learnerId,
        enrolledAt: enrollment.enrolledAt,
      });

      res.status(200).json({
        received: true,
        message: 'Payment verified and enrollment granted',
        enrollment,
      });
      return;
    }

    await paymentService.markEventCompleted(event.id);
    res.status(200).json({ received: true });
  } catch (err: any) {
    await paymentService.markEventFailed(event.id, err.message);
    res.status(500).json({ message: 'Webhook processing error', error: err.message });
  }
});

export default router;
