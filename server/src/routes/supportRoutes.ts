import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SupportTicketModel } from '../models';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { repo } from '../data/dbRepository';
import { validateBody } from '../middleware/validate';
import { supportTicketSchema } from '../validation/schemas';

const router = Router();

// POST /api/support/ticket - Public/Student Support & Inquiries (WEB-02, ADM-04)
router.post('/ticket', validateBody(supportTicketSchema), async (req: Request, res: Response) => {
  try {
    const { fullName, email, category, subject, message } = req.body;

    if (!fullName || !email || !subject || !message) {
      res.status(400).json({ message: 'Full name, email, subject, and message are required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Valid institutional or personal email address required' });
      return;
    }

    const ticketId = `TIK-${uuidv4().slice(0, 8).toUpperCase()}`;

    const ticket = await SupportTicketModel.create({
      id: ticketId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      category: category || 'GENERAL',
      subject: subject.trim(),
      message: message.trim(),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    });

    // Record audit trail
    await repo.createAuditLog({
      id: `log-${uuidv4().slice(0, 8)}`,
      tenantId: null,
      actorId: email,
      actorName: fullName,
      actorRole: 'INQUIRER',
      action: 'SUPPORT_TICKET_SUBMITTED',
      resourceType: 'SUPPORT_TICKET',
      resourceId: ticketId,
      details: `Support ticket [${category}] submitted: "${subject}"`,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Support request received. Academic help desk will follow up shortly.',
      ticket: {
        id: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to submit support request', error: err.message });
  }
});

// GET /api/support/tickets - View support tickets (Platform Administrators)
router.get('/tickets', requireAuth, requireRole('PLATFORM_ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const tickets = await SupportTicketModel.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ tickets });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
  }
});

export default router;

