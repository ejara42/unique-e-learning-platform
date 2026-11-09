import { Router, Request, Response } from 'express';
import { searchService } from '../search/searchService';
import { getTenantContext } from '../middleware/tenant';

const router = Router();

// GET /api/search/courses - Decoupled Typo-Tolerant, Faceted Search
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const {
      q,
      category,
      level,
      minPrice,
      maxPrice,
      minRating,
      page,
      limit,
      tenantId,
    } = req.query;

    const context = getTenantContext();
    const effectiveTenant = context.tenantId || (typeof tenantId === 'string' ? tenantId : null);

    const results = await searchService.searchCourses({
      query: (q as string) || '',
      category: category as string,
      level: level as string,
      tenantId: effectiveTenant,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ message: 'Search query execution failed', error: err.message });
  }
});

export default router;
