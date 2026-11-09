"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dbRepository_1 = require("../data/dbRepository");
const cacheService_1 = require("../cache/cacheService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/certificates - User certificates
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const userCerts = await dbRepository_1.repo.getCertificates(userId);
        res.json({ certificates: userCerts });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving certificates', error: err.message });
    }
});
// GET /api/certificates/verify/:code - Public Verification Portal
router.get('/verify/:code', async (req, res) => {
    try {
        const code = String(req.params.code);
        const cacheKey = `cert:verify:${code}`;
        const cached = await cacheService_1.cacheService.get(cacheKey);
        if (cached) {
            res.setHeader('X-Cache-Status', 'HIT');
            res.status(cached.statusHttp || 200).json(cached.body);
            return;
        }
        const certificate = await dbRepository_1.repo.getCertificateByCode(code);
        if (!certificate) {
            res.status(404).json({
                valid: false,
                message: 'Certificate not found. This credential code is invalid or has not been issued.',
            });
            return;
        }
        if (certificate.status === 'REVOKED') {
            const responsePayload = {
                valid: false,
                status: 'REVOKED',
                certificate,
                message: `This certificate was REVOKED on safety/academic grounds. Reason: ${certificate.revocationReason || 'Administrative revocation'}`,
            };
            await cacheService_1.cacheService.set(cacheKey, { statusHttp: 200, body: responsePayload }, { ttlSeconds: 1800, tags: [`cert:${code}`] });
            res.setHeader('X-Cache-Status', 'MISS');
            res.status(200).json(responsePayload);
            return;
        }
        const responsePayload = {
            valid: true,
            status: 'ACTIVE',
            certificate,
            message: 'Official Authenticated Credential issued by EduSphere platform.',
        };
        await cacheService_1.cacheService.set(cacheKey, { statusHttp: 200, body: responsePayload }, { ttlSeconds: 3600, tags: [`cert:${code}`] });
        res.setHeader('X-Cache-Status', 'MISS');
        res.json(responsePayload);
    }
    catch (err) {
        res.status(500).json({ message: 'Error verifying credential', error: err.message });
    }
});
// PATCH /api/certificates/:id/revoke - Revoke invalid credential (Protected with Tenant Ownership Check)
router.patch('/:id/revoke', auth_1.requireAuth, (0, auth_1.requireRole)('INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
    try {
        const { reason } = req.body;
        const targetId = req.params.id;
        // Retrieve existing certificate to verify tenant ownership
        const cert = (await dbRepository_1.repo.getCertificateByCode(targetId)) ||
            (await dbRepository_1.repo.getCertificates()).find(c => c.id === targetId || c.certificateNumber === targetId);
        if (!cert) {
            res.status(404).json({ message: 'Certificate not found' });
            return;
        }
        // Cross-tenant barrier: Institution Admin can only revoke certificates for their own institution
        if (req.user?.activeRole === 'INSTITUTION_ADMIN') {
            if (!cert.tenantId || cert.tenantId !== req.user.institutionId) {
                res.status(403).json({ message: 'Forbidden: You cannot revoke credentials issued by another institution.' });
                return;
            }
        }
        const updatedCert = await dbRepository_1.repo.revokeCertificate(targetId, reason || 'Revoked by institution authority');
        if (!updatedCert) {
            res.status(404).json({ message: 'Certificate not found during revocation update' });
            return;
        }
        await cacheService_1.cacheService.invalidateKey(`cert:verify:${updatedCert.certificateNumber}`);
        await cacheService_1.cacheService.invalidateByTag(`cert:${updatedCert.certificateNumber}`);
        await dbRepository_1.repo.createAuditLog({
            id: `log-${Date.now()}`,
            tenantId: updatedCert.tenantId || null,
            actorId: req.user?.id || 'admin',
            actorName: req.user?.fullName || 'Academic Officer',
            actorRole: req.user?.activeRole || 'INSTITUTION_ADMIN',
            action: 'CERTIFICATE_REVOKED',
            resourceType: 'CERTIFICATE',
            resourceId: updatedCert.certificateNumber,
            details: `Revocation reason: ${reason}`,
            ipAddress: req.ip || '127.0.0.1',
            timestamp: new Date().toISOString(),
        });
        res.json({
            message: `Certificate ${updatedCert.certificateNumber} has been revoked successfully.`,
            certificate: updatedCert,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error revoking certificate', error: err.message });
    }
});
exports.default = router;
