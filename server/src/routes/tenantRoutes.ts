import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repo } from '../data/dbRepository';
import { cacheService } from '../cache/cacheService';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { ITenant, TenantStatus } from '../types';
import { validateBody } from '../middleware/validate';
import { tenantRegistrationSchema, tenantStatusSchema } from '../validation/schemas';

const router = Router();

// GET /api/tenants - List all or filtered by status
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const cacheKey = `tenants:directory:${(status as string) || 'all'}:${(type as string) || 'all'}`;
    const cached = await cacheService.get<{ tenants: ITenant[] }>(cacheKey);

    if (cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.json(cached);
      return;
    }

    const tenants = await repo.getTenants({
      status: status as string,
      type: type as string,
    });

    const payload = { tenants };
    await cacheService.set(cacheKey, payload, { ttlSeconds: 900, tags: ['tenants:directory'] });

    res.setHeader('X-Cache-Status', 'MISS');
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving institutions', error: err.message });
  }
});

// GET /api/tenants/:id - Get specific institution
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenant = await repo.getTenantById(req.params.id as string);
    if (!tenant) {
      res.status(404).json({ message: 'Institution not found' });
      return;
    }
    res.json({ tenant });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving institution', error: err.message });
  }
});

// POST /api/tenants/register - Onboarding application (Mockup 7)
router.post('/register', validateBody(tenantRegistrationSchema), async (req: Request, res: Response) => {
  try {
    const {
      institutionName,
      institutionType,
      address,
      contactEmail,
      contactPhone,
      documents,
    } = req.body;

    if (!institutionName || !institutionType || !contactEmail) {
      res.status(400).json({ message: 'Institution name, type, and email are required' });
      return;
    }

    const slug = institutionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newTenant: ITenant = {
      id: `tenant-${uuidv4().slice(0, 8)}`,
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

    await repo.createTenant(newTenant);

    // Audit log
    await repo.createAuditLog({
      id: `log-${uuidv4().slice(0, 8)}`,
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
  } catch (err: any) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// PATCH /api/tenants/:id/status - Approve, suspend or reject institution
router.patch('/:id/status', requireAuth, requireRole('PLATFORM_ADMIN'), validateBody(tenantStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses: TenantStatus[] = ['PENDING_VERIFICATION', 'VERIFIED', 'SUSPENDED', 'REJECTED'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const tenant = await repo.updateTenantStatus(req.params.id as string, status, remarks);
    if (!tenant) {
      res.status(404).json({ message: 'Institution not found' });
      return;
    }

    await cacheService.invalidateByTag('tenants:directory');

    await repo.createAuditLog({
      id: `log-${uuidv4().slice(0, 8)}`,
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
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update institution status', error: err.message });
  }
});

export default router;
