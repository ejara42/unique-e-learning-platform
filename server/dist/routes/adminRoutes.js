"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dbRepository_1 = require("../data/dbRepository");
const models_1 = require("../models");
const tenant_1 = require("../middleware/tenant");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/admin/metrics - System Overview & KPI Metrics (Protected)
router.get('/metrics', auth_1.requireAuth, (0, auth_1.requireRole)('PLATFORM_ADMIN', 'INSTITUTION_ADMIN'), (0, validate_1.validateQuery)(schemas_1.emptyQuerySchema), async (req, res) => {
    try {
        const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
        const context = (0, tenant_1.getTenantContext)();
        const effectiveTenantId = isPlatformAdmin ? context.tenantId : req.user?.institutionId || null;
        const allTenants = await dbRepository_1.repo.getTenants();
        const visibleTenants = isPlatformAdmin
            ? allTenants
            : allTenants.filter(t => t.id === effectiveTenantId);
        const users = await dbRepository_1.repo.getUsers();
        const courses = await dbRepository_1.repo.getCourses({}, effectiveTenantId);
        const auditLogs = await dbRepository_1.repo.getAuditLogs(effectiveTenantId);
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
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving admin metrics', error: err.message });
    }
});
// GET /api/admin/admissions - Student Admission Requests with strict tenant isolation (Protected)
router.get('/admissions', auth_1.requireAuth, (0, auth_1.requireRole)('PLATFORM_ADMIN', 'INSTITUTION_ADMIN'), (0, validate_1.validateQuery)(schemas_1.adminAdmissionsQuerySchema), async (req, res) => {
    try {
        const { institutionId, status } = req.query;
        const isPlatformAdmin = req.user?.activeRole === 'PLATFORM_ADMIN';
        const userInstitutionId = req.user?.institutionId;
        const context = (0, tenant_1.getTenantContext)();
        let targetTenantId = undefined;
        if (isPlatformAdmin) {
            targetTenantId = institutionId || context.tenantId || undefined;
        }
        else {
            // Non-platform admin is strictly confined to their own institution
            if (institutionId && institutionId !== userInstitutionId) {
                res.status(403).json({ message: 'Forbidden: You cannot inspect admission requests of another institution.' });
                return;
            }
            targetTenantId = userInstitutionId || undefined;
        }
        const admissions = await dbRepository_1.repo.getAdmissions({
            institutionId: targetTenantId,
            status: status,
        }, targetTenantId);
        res.json({ admissions });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving admissions', error: err.message });
    }
});
// PATCH /api/admin/admissions/:id/status - Approve or reject student application
router.patch('/admissions/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)('INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), (0, validate_1.validateParams)(schemas_1.identifierParamsSchema), (0, validate_1.validateBody)(schemas_1.admissionStatusSchema), async (req, res) => {
    try {
        const { status, remarks } = req.body;
        const validStatuses = ['ACCEPTED', 'REJECTED', 'PENDING'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
            return;
        }
        const admissions = await dbRepository_1.repo.getAdmissions();
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
        if (dbRepository_1.repo.isMongoActive()) {
            await models_1.AdmissionModel.findOneAndUpdate({ id: admission.id }, { $set: { status, remarks } });
        }
        await dbRepository_1.repo.createAuditLog({
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
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update admission status', error: err.message });
    }
});
exports.default = router;
