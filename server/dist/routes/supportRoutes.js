"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const dbRepository_1 = require("../data/dbRepository");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// POST /api/support/ticket - Public/Student Support & Inquiries (WEB-02, ADM-04)
router.post('/ticket', (0, validate_1.validateBody)(schemas_1.supportTicketSchema), async (req, res) => {
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
        const ticketId = `TIK-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
        const ticket = await models_1.SupportTicketModel.create({
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
        await dbRepository_1.repo.createAuditLog({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
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
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to submit support request', error: err.message });
    }
});
// GET /api/support/tickets - View support tickets (Platform Administrators)
router.get('/tickets', auth_1.requireAuth, (0, auth_1.requireRole)('PLATFORM_ADMIN'), async (_req, res) => {
    try {
        const tickets = await models_1.SupportTicketModel.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json({ tickets });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
    }
});
exports.default = router;
