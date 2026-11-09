"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const searchService_1 = require("../search/searchService");
const tenant_1 = require("../middleware/tenant");
const router = (0, express_1.Router)();
// GET /api/search/courses - Decoupled Typo-Tolerant, Faceted Search
router.get('/courses', async (req, res) => {
    try {
        const { q, category, level, minPrice, maxPrice, minRating, page, limit, tenantId, } = req.query;
        const context = (0, tenant_1.getTenantContext)();
        const effectiveTenant = context.tenantId || (typeof tenantId === 'string' ? tenantId : null);
        const results = await searchService_1.searchService.searchCourses({
            query: q || '',
            category: category,
            level: level,
            tenantId: effectiveTenant,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            minRating: minRating ? parseFloat(minRating) : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
        res.json(results);
    }
    catch (err) {
        res.status(500).json({ message: 'Search query execution failed', error: err.message });
    }
});
exports.default = router;
