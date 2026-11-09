import { Router, Response } from 'express';
import { repo } from '../data/dbRepository';
import { AdmissionModel } from '../models';
import { getTenantContext } from '../middleware/tenant';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { admissionStatusSchema } from '../validation/schemas';

const router = Router();

// GET /api/admin/metrics - System Overview & KPI Metrics (Protected)
router.get('/metrics', requireAuth, requireRole('PLATFORM_ADMIN', 'INSTITUTION_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
    const context = getTenantContext();
    const effectiveTenantId = isPlatformAdmin ? context.tenantId : req.user?.institutionId || null;

    const allTenants = await repo.getTenants();
    const visibleTenants = isPlatformAdmin
      ? allTenants
      : allTenants.filter(t => t.id === effectiveTenantId);

    const users = await repo.getUsers();
    const courses = await repo.getCourses({}, effectiveTenantId);
    const auditLogs = await repo.getAuditLogs(effectiveTenantId);

    const pendingInstitutions = visibleTenants.filter(t => t.status === 'PENDING_VERIFICATION').length;
    const verifiedInstitutions = visibleTenants.filter(t => t.status === 'VERIFIED').length;
    const scopedUsers = isPlatformAdmin ? users : users.filter(u => u.institutionId === effectiveTenantId);
    const activeLearners = scopedUsers.filter(u => u.activeRole === 'STUDENT').length;

    res.json({
      metrics: {
        totalInstitutions: visibleTenants.length,
        pendingInstitutions,
        verifiedInstitutions,
        totalUsers: scopedUsers.length,
        usersGrowthPct: 0,
        totalCourses: courses.length,
        coursesGrowthPct: 0,
        activeLearners,
        learnersGrowthPct: 0,
      },
      allInstitutions: visibleTenants,
      recentInstitutions: visibleTenants,
      recentActivities: auditLogs.slice(0, 10),
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving admin metrics', error: err.message });
  }
});

// GET /api/admin/admissions - Student Admission Requests with strict tenant isolation (Protected)
router.get('/admissions', requireAuth, requireRole('PLATFORM_ADMIN', 'INSTITUTION_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { institutionId, status } = req.query;
    const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
    const userInstitutionId = req.user?.institutionId;
    const context = getTenantContext();

    let targetTenantId: string | undefined = undefined;

    if (isPlatformAdmin) {
      targetTenantId = (institutionId as string) || context.tenantId || undefined;
    } else {
      // Non-platform admin is strictly confined to their own institution
      if (institutionId && institutionId !== userInstitutionId) {
        res.status(403).json({ message: 'Forbidden: You cannot inspect admission requests of another institution.' });
        return;
      }
      targetTenantId = userInstitutionId || undefined;
    }

    const admissions = await repo.getAdmissions({
      institutionId: targetTenantId,
      status: status as string,
    }, targetTenantId);

    res.json({ admissions });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving admissions', error: err.message });
  }
});

// PATCH /api/admin/admissions/:id/status - Approve or reject student application
router.patch('/admissions/:id/status', requireAuth, requireRole('INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), validateBody(admissionStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = ['ACCEPTED', 'REJECTED', 'PENDING'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const admissions = await repo.getAdmissions();
    const admission = admissions.find(a => a.id === req.params.id);

    if (!admission) {
      res.status(404).json({ message: 'Admission application not found' });
      return;
    }

    // Cross-tenant protection: Institution Admin can only decide on their own institution's applications
    if (req.user?.activeRole === 'INSTITUTION_ADMIN' && req.user.institutionId !== admission.institutionId) {
      res.status(403).json({ message: 'Forbidden: You cannot modify admissions for another institution.' });
      return;
    }

    admission.status = status;
    admission.remarks = remarks;

    if (repo.isMongoActive()) {
      await AdmissionModel.findOneAndUpdate(
        { id: admission.id },
        { $set: { status, remarks } }
      );
    }

    await repo.createAuditLog({
      id: `log-${Date.now()}`,
      tenantId: admission.institutionId,
      actorId: req.user?.id || 'admin',
      actorName: req.user?.fullName || 'Academic Officer',
      actorRole: req.user?.activeRole || 'INSTITUTION_ADMIN',
      action: `ADMISSION_${status}`,
      resourceType: 'ADMISSION',
      resourceId: admission.id,
      details: `Student admission ${status}. Candidate: ${admission.studentName}`,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: `Student admission application has been ${status.toLowerCase()}!`,
      admission,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update admission status', error: err.message });
  }
});

export default router;
