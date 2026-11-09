"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchService = exports.EnterpriseSearchService = void 0;
const dbRepository_1 = require("../data/dbRepository");
function levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
            else {
                dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + 1 // substitution
                );
            }
        }
    }
    return dp[m][n];
}
class EnterpriseSearchService {
    indexedCourses = new Map();
    isInitialized = false;
    constructor() { }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            const allCourses = await dbRepository_1.repo.getCourses();
            for (const c of allCourses) {
                if (c.isPublished) {
                    this.indexedCourses.set(c.id, {
                        id: c.id,
                        title: c.title,
                        slug: c.slug,
                        category: c.category,
                        level: c.level,
                        instructorName: c.instructorName,
                        institutionName: c.institutionName || 'EduSphere Academy',
                        price: c.price,
                        rating: c.rating,
                        ratingCount: c.ratingCount,
                        durationHours: c.durationHours,
                        tags: c.learningOutcomes || [],
                        isPublished: c.isPublished,
                        tenantId: c.tenantId || null,
                    });
                }
            }
            this.isInitialized = true;
            console.log(`🔎 [EduSphere Search] Initialized search engine with ${this.indexedCourses.size} published courses.`);
        }
        catch (e) {
            console.warn('[Search] Initialization warning:', e.message);
        }
    }
    async indexCourse(course) {
        if (course.isPublished) {
            this.indexedCourses.set(course.id, { ...course });
        }
        else {
            this.indexedCourses.delete(course.id);
        }
    }
    async updateCourse(courseId, updates) {
        const existing = this.indexedCourses.get(courseId);
        if (existing) {
            const merged = { ...existing, ...updates };
            if (merged.isPublished) {
                this.indexedCourses.set(courseId, merged);
            }
            else {
                this.indexedCourses.delete(courseId);
            }
        }
    }
    async deleteCourse(courseId) {
        this.indexedCourses.delete(courseId);
    }
    async searchCourses(options) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const rawQuery = (options.query || '').trim().toLowerCase();
        const queryTokens = rawQuery.split(/\s+/).filter(Boolean);
        let candidates = Array.from(this.indexedCourses.values());
        // 1. Facet Filtering
        if (options.category) {
            const catLower = options.category.toLowerCase();
            candidates = candidates.filter(c => c.category.toLowerCase() === catLower);
        }
        if (options.level) {
            const lvlLower = options.level.toLowerCase();
            candidates = candidates.filter(c => c.level.toLowerCase() === lvlLower);
        }
        if (options.tenantId) {
            candidates = candidates.filter(c => c.tenantId === options.tenantId);
        }
        if (typeof options.minPrice === 'number') {
            candidates = candidates.filter(c => c.price >= options.minPrice);
        }
        if (typeof options.maxPrice === 'number') {
            candidates = candidates.filter(c => c.price <= options.maxPrice);
        }
        if (typeof options.minRating === 'number') {
            candidates = candidates.filter(c => c.rating >= options.minRating);
        }
        // Compute Facets before text filtering
        const facets = {
            categories: {},
            levels: {},
            priceRanges: {
                'Free (0)': 0,
                'Under $50': 0,
                '$50 - $100': 0,
                'Over $100': 0,
            },
        };
        for (const c of candidates) {
            facets.categories[c.category] = (facets.categories[c.category] || 0) + 1;
            facets.levels[c.level] = (facets.levels[c.level] || 0) + 1;
            if (c.price === 0)
                facets.priceRanges['Free (0)']++;
            else if (c.price < 50)
                facets.priceRanges['Under $50']++;
            else if (c.price <= 100)
                facets.priceRanges['$50 - $100']++;
            else
                facets.priceRanges['Over $100']++;
        }
        // 2. Typo-Tolerant & Substring Ranking
        let scoredHits = [];
        if (queryTokens.length === 0) {
            // Default: rank by rating and popularity
            scoredHits = candidates.map(doc => ({ doc, score: doc.rating * 10 + doc.ratingCount }));
        }
        else {
            for (const doc of candidates) {
                const searchableText = `${doc.title} ${doc.category} ${doc.instructorName} ${doc.institutionName} ${doc.tags.join(' ')}`.toLowerCase();
                let score = 0;
                let allTokensMatched = true;
                for (const token of queryTokens) {
                    if (searchableText.includes(token)) {
                        // Exact substring match
                        score += 10;
                        if (doc.title.toLowerCase().includes(token)) {
                            score += 15; // Title bonus
                        }
                    }
                    else {
                        // Fuzzy Typo-Tolerance match (allow edit distance <= 2 for words >= 4 chars)
                        const words = searchableText.split(/\s+/);
                        const minDistance = Math.min(...words.map(w => (Math.abs(w.length - token.length) <= 2 ? levenshteinDistance(w, token) : 99)));
                        if (minDistance <= 2 && token.length >= 4) {
                            score += (3 - minDistance) * 3; // Typo match
                        }
                        else {
                            allTokensMatched = false;
                        }
                    }
                }
                if (score > 0 && (queryTokens.length <= 1 || allTokensMatched)) {
                    // Weight by rating
                    score += doc.rating * 2;
                    scoredHits.push({ doc, score });
                }
            }
        }
        // Sort by computed relevance score descending
        scoredHits.sort((a, b) => b.score - a.score);
        // 3. Pagination
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(100, options.limit || 20));
        const totalHits = scoredHits.length;
        const totalPages = Math.ceil(totalHits / limit) || 1;
        const offset = (page - 1) * limit;
        const hits = scoredHits.slice(offset, offset + limit).map(s => s.doc);
        return {
            hits,
            totalHits,
            page,
            totalPages,
            facets,
        };
    }
}
exports.EnterpriseSearchService = EnterpriseSearchService;
exports.searchService = new EnterpriseSearchService();
