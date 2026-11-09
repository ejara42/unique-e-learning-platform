"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCourseSubscribers = registerCourseSubscribers;
const eventBus_1 = require("../eventBus");
const models_1 = require("../../models");
const cacheService_1 = require("../../cache/cacheService");
const searchService_1 = require("../../search/searchService");
const mongoConnection_1 = require("../../data/mongoConnection");
function registerCourseSubscribers() {
    // COURSE_CREATED
    eventBus_1.eventBus.subscribe('COURSE_CREATED', async (event) => {
        try {
            const course = event.payload;
            await cacheService_1.cacheService.invalidateByTag('courses:catalog');
            if (course.isPublished) {
                await searchService_1.searchService.indexCourse({
                    id: course.id,
                    title: course.title,
                    slug: course.slug,
                    category: course.category,
                    level: course.level,
                    instructorName: course.instructorName,
                    institutionName: course.institutionName || 'EduSphere Academy',
                    price: course.price,
                    rating: course.rating,
                    ratingCount: course.ratingCount,
                    durationHours: course.durationHours,
                    tags: course.learningOutcomes || [],
                    isPublished: course.isPublished,
                    tenantId: course.tenantId || null,
                });
            }
        }
        catch (err) {
            console.error(`[CourseSubscriber Error - COURSE_CREATED]`, err?.message || err);
        }
    });
    // COURSE_UPDATED
    eventBus_1.eventBus.subscribe('COURSE_UPDATED', async (event) => {
        try {
            const { courseId, updates } = event.payload;
            await cacheService_1.cacheService.invalidateByTag('courses:catalog');
            await cacheService_1.cacheService.invalidateByTag(`course:${courseId}`);
            await searchService_1.searchService.updateCourse(courseId, {
                ...(updates.title && { title: updates.title }),
                ...(updates.category && { category: updates.category }),
                ...(updates.level && { level: updates.level }),
                ...(typeof updates.price === 'number' && { price: updates.price }),
                ...(typeof updates.rating === 'number' && { rating: updates.rating }),
                ...(typeof updates.ratingCount === 'number' && { ratingCount: updates.ratingCount }),
                ...(typeof updates.isPublished === 'boolean' && { isPublished: updates.isPublished }),
            });
        }
        catch (err) {
            console.error(`[CourseSubscriber Error - COURSE_UPDATED]`, err?.message || err);
        }
    });
    // REVIEW_SUBMITTED
    eventBus_1.eventBus.subscribe('REVIEW_SUBMITTED', async (event) => {
        try {
            const { courseId } = event.payload;
            let allReviews = [];
            if (mongoConnection_1.connectionState.isConnected) {
                try {
                    allReviews = await models_1.CourseReviewModel.find({ courseId });
                }
                catch (dbErr) {
                    console.warn(`[CourseSubscriber] Could not fetch reviews from db: ${dbErr?.message}`);
                }
            }
            if (allReviews.length > 0) {
                const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
                const roundedRating = Math.round(avgRating * 10) / 10;
                const ratingCount = allReviews.length;
                if (mongoConnection_1.connectionState.isConnected) {
                    try {
                        await models_1.CourseModel.findOneAndUpdate({ id: courseId }, { rating: roundedRating, ratingCount });
                    }
                    catch { }
                }
                await cacheService_1.cacheService.invalidateByTag(`course:${courseId}`);
                await cacheService_1.cacheService.invalidateByTag('courses:catalog');
                await searchService_1.searchService.updateCourse(courseId, {
                    rating: roundedRating,
                    ratingCount,
                });
            }
        }
        catch (err) {
            console.error(`[CourseSubscriber Error - REVIEW_SUBMITTED]`, err?.message || err);
        }
    });
}
