"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEnrollmentSubscribers = registerEnrollmentSubscribers;
const eventBus_1 = require("../eventBus");
const models_1 = require("../../models");
const cacheService_1 = require("../../cache/cacheService");
const emailService_1 = require("../../services/emailService");
const searchService_1 = require("../../search/searchService");
const mongoConnection_1 = require("../../data/mongoConnection");
function registerEnrollmentSubscribers() {
    eventBus_1.eventBus.subscribe('COURSE_ENROLLED', async (event) => {
        const { courseId, learnerId, learnerEmail } = event.payload;
        try {
            // 1. Increment enrolledCount on the course
            let updatedCourse = null;
            if (mongoConnection_1.connectionState.isConnected) {
                try {
                    updatedCourse = await models_1.CourseModel.findOneAndUpdate({ id: courseId }, { $inc: { enrolledCount: 1 } }, { new: true });
                }
                catch (dbErr) {
                    console.warn(`[EnrollmentSubscriber] Course count update note: ${dbErr?.message}`);
                }
            }
            // 2. Invalidate cache tags for the course & catalog
            await cacheService_1.cacheService.invalidateByTag(`course:${courseId}`);
            await cacheService_1.cacheService.invalidateByTag('courses:catalog');
            // 3. Update search index if course exists in search engine
            if (updatedCourse) {
                await searchService_1.searchService.updateCourse(courseId, {
                    rating: updatedCourse.rating,
                    ratingCount: updatedCourse.ratingCount,
                });
            }
            // 4. Asynchronously send welcome / confirmation email to the student
            let recipientEmail = learnerEmail;
            if (!recipientEmail && mongoConnection_1.connectionState.isConnected) {
                try {
                    const user = await models_1.UserModel.findOne({ id: learnerId });
                    if (user && user.email) {
                        recipientEmail = user.email;
                    }
                }
                catch { }
            }
            if (recipientEmail) {
                const courseTitle = event.payload.courseTitle || updatedCourse?.title || 'Your Course';
                await emailService_1.emailService.sendEmail({
                    to: recipientEmail,
                    subject: `Enrollment Confirmed: ${courseTitle}`,
                    html: `<p>Congratulations! You are officially enrolled in <strong>${courseTitle}</strong> on EduSphere.</p><p>You can start learning immediately.</p>`,
                    text: `Congratulations! You are officially enrolled in ${courseTitle} on EduSphere.`,
                }).catch((err) => {
                    console.warn(`[EnrollmentSubscriber] Failed to send confirmation email:`, err?.message);
                });
            }
        }
        catch (err) {
            console.error(`[EnrollmentSubscriber Error] Event: ${event.eventId}`, err?.message || err);
        }
    });
}
