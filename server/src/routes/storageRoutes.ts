import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { storageService, FileCategory } from '../services/storageService';
import { validateBody, validateParams } from '../middleware/validate';
import { assetIdParamsSchema, storageConfirmSchema, storageUploadSchema } from '../validation/schemas';

const router = Router();

// POST /api/storage/presigned-upload - Request secure presigned upload URL
router.post('/presigned-upload', requireAuth, validateBody(storageUploadSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileType, fileSize, category, isPublic } = req.body;

    if (!fileName || !fileType || typeof fileSize !== 'number' || !category) {
      res.status(400).json({
        message: 'Missing required upload parameters: fileName, fileType, fileSize, and category are required.',
      });
      return;
    }

    const tenantId = req.user?.institutionId || (req as any).tenant?.tenantId || null;
    const ownerId = req.user?.id || 'anonymous';

    const presigned = await storageService.getPresignedUploadUrl({
      fileName,
      fileType,
      fileSize,
      category: category as FileCategory,
      tenantId,
      ownerId,
      isPublic: Boolean(isPublic),
    });

    res.status(200).json({
      message: 'Presigned upload URL generated successfully',
      ...presigned,
    });
  } catch (err: any) {
    const status = err.message.includes('Forbidden') || err.message.includes('Security Violation') ? 403 : 400;
    res.status(status).json({ message: err.message });
  }
});

// POST /api/storage/confirm-upload - Confirm file has been transferred to R2
router.post('/confirm-upload', requireAuth, validateBody(storageConfirmSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { assetId } = req.body;
    if (!assetId) {
      res.status(400).json({ message: 'assetId is required' });
      return;
    }

    const asset = await storageService.confirmUpload(assetId, req.user?.id || '');
    res.status(200).json({
      message: 'File upload confirmed and activated',
      asset,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/storage/download/:assetId - Get presigned download URL with tenant isolation
router.get('/download/:assetId', requireAuth, validateParams(assetIdParamsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const assetId = String(req.params.assetId);
    const tenantId = req.user?.institutionId || (req as any).tenant?.tenantId || null;

    const downloadInfo = await storageService.getPresignedDownloadUrl({
      assetId,
      requestingTenantId: tenantId,
      requestingUserId: req.user?.id || '',
      requestingUserRole: req.user?.activeRole || 'STUDENT',
    });

    res.status(200).json({
      message: 'Presigned download URL generated successfully',
      ...downloadInfo,
    });
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : 404;
    res.status(status).json({ message: err.message });
  }
});

// DELETE /api/storage/:assetId - Delete file asset
router.delete('/:assetId', requireAuth, validateParams(assetIdParamsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const assetId = String(req.params.assetId);
    const tenantId = req.user?.institutionId || (req as any).tenant?.tenantId || null;

    const success = await storageService.deleteAsset(
      assetId,
      tenantId,
      req.user?.id,
      req.user?.activeRole
    );

    if (!success) {
      res.status(404).json({ message: 'File asset not found' });
      return;
    }

    res.status(200).json({ message: 'File asset successfully deleted' });
  } catch (err: any) {
    const status = err.message.includes('Forbidden') ? 403 : 500;
    res.status(status).json({ message: err.message });
  }
});

// GET /api/storage/telemetry - Object storage telemetry
router.get('/telemetry', (_req, res) => {
  res.json({ storage: storageService.getTelemetry() });
});

export default router;
