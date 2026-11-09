"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const cacheService_1 = require("../cache/cacheService");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/tenants - List all or filtered by status
router.get('/', async (req, res) => {
    try {
        const { status, type } = req.query;
        const cacheKey = `tenants:directory:${status || 'all'}:${type || 'all'}`;
        const cached = await cacheService_1.cacheService.get(cacheKey);
        if (cached) {
            res.setHeader('X-Cache-Status', 'HIT');
            res.json(cached);
            return;
        }
        const tenants = await dbRepository_1.repo.getTenants({
            status: status,
            type: type,
        });
        const payload = { tenants };
        await cacheService_1.cacheService.set(cacheKey, payload, { ttlSeconds: 900, tags: ['tenants:directory'] });
        res.setHeader('X-Cache-Status', 'MISS');
        res.json(payload);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving institutions', error: err.message });
    }
});
// GET /api/tenants/:id - Get specific institution
router.get('/:id', async (req, res) => {
    try {
        const tenant = await dbRepository_1.repo.getTenantById(req.params.id);
        if (!tenant) {
            res.status(404).json({ message: 'Institution not found' });
            return;
        }
        res.json({ tenant });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving institution', error: err.message });
    }
});
// POST /api/tenants/register - Onboarding application (Mockup 7)
router.post('/register', (0, validate_1.validateBody)(schemas_1.tenantRegistrationSchema), async (req, res) => {
    try {
        const { institutionName, institutionType, address, contactEmail, contactPhone, documents, } = req.body;
        if (!institutionName || !institutionType || !contactEmail) {
            res.status(400).json({ message: 'Institution name, type, and email are required' });
            return;
        }
        const slug = institutionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const newTenant = {
            id: `tenant-${(0, uuid_1.v4)().slice(0, 8)}`,
            name: institutionName.trim(),
            slug,
            domains: [`${slug}.edusphere.io`],
            type: institutionType || 'UNIVERSITY',
            status: 'PENDING_VERIFICATION',
            contactEmail: contactEmail.trim().toLowerCase(),
            contactPhone: contactPhone || '',
            address: address || '',
            verificationDocuments: Array.isArray(documents) ? documents : [],
            branding: {
                primaryColor: '#2563EB',
                secondaryColor: '#1E40AF',
            },
            settings: {
                allowIndependentEnrollment: true,
                requireEnrollmentApproval: true,
                maxStorageQuotaGb: 100,
                enabledFeatures: ['LIVE_CLASSES', 'PROCTORING', 'SCORM'],
            },
            stats: {
                totalStudents: 0,
                totalCourses: 0,
                totalInstructors: 0,
            },
            createdAt: new Date().toISOString(),
        };
        await dbRepository_1.repo.createTenant(newTenant);
        // Audit log
        await dbRepository_1.repo.createAuditLog({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: newTenant.id,
            actorId: 'guest-applicant',
            actorName: contactEmail,
            actorRole: 'APPLICANT',
            action: 'INSTITUTION_REGISTERED',
            resourceType: 'TENANT',
            resourceId: newTenant.id,
            details: `Application submitted for ${institutionName}`,
            ipAddress: req.ip || '127.0.0.1',
            timestamp: new Date().toISOString(),
        });
        res.status(201).json({
            message: 'Institution registration application received. Pending Ministry/Platform accreditation review.',
            tenant: newTenant,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
});
// PATCH /api/tenants/:id/status - Approve, suspend or reject institution
router.patch('/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)('PLATFORM_ADMIN'), (0, validate_1.validateBody)(schemas_1.tenantStatusSchema), async (req, res) => {
    try {
        const { status, remarks } = req.body;
        const validStatuses = ['PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }
        const tenant = await dbRepository_1.repo.updateTenantStatus(req.params.id, status, remarks);
        if (!tenant) {
            res.status(404).json({ message: 'Institution not found' });
            return;
        }
        await cacheService_1.cacheService.invalidateByTag('tenants:directory');
        await dbRepository_1.repo.createAuditLog({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: tenant.id,
            actorId: req.user?.id || 'admin',
            actorName: req.user?.fullName || 'Super Administrator',
            actorRole: req.user?.activeRole || 'PLATFORM_ADMIN',
            action: `INSTITUTION_STATUS_${status}`,
            resourceType: 'TENANT',
            resourceId: tenant.id,
            details: `Status updated to ${status}. Remarks: ${remarks || 'None'}`,
            ipAddress: req.ip || '127.0.0.1',
            timestamp: new Date().toISOString(),
        });
        res.json({
            message: `Institution status updated to ${status}`,
            tenant,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update institution status', error: err.message });
    }
});
exports.default = router;
