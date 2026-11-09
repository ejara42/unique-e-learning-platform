import { eventBus, DomainEvent } from '../eventBus';
import { CourseModel, UserModel } from '../../models';
import { cacheService } from '../../cache/cacheService';
import { emailService } from '../../services/emailService';
import { searchService } from '../../search/searchService';
import { connectionState } from '../../data/mongoConnection';

export interface CourseEnrolledPayload {
  enrollmentId: string;
  courseId: string;
  learnerId: string;
  courseTitle?: string;
  learnerEmail?: string;
  enrolledAt: string;
}

export function registerEnrollmentSubscribers(): void {
  eventBus.subscribe<CourseEnrolledPayload>('COURSE_ENROLLED', async (event: DomainEvent<CourseEnrolledPayload>) => {
    const { courseId, learnerId, learnerEmail } = event.payload;

    try {
      // 1. Increment enrolledCount on the course
      let updatedCourse: any = null;
      if (connectionState.isConnected) {
        try {
          updatedCourse = await CourseModel.findOneAndUpdate(
            { id: courseId },
            { $inc: { enrolledCount: 1 } },
            { new: true }
          );
        } catch (dbErr: any) {
          console.warn(`[EnrollmentSubscriber] Course count update note: ${dbErr?.message}`);
        }
      }

      // 2. Invalidate cache tags for the course & catalog
      await cacheService.invalidateByTag(`course:${courseId}`);
      await cacheService.invalidateByTag('courses:catalog');

      // 3. Update search index if course exists in search engine
      if (updatedCourse) {
        await searchService.updateCourse(courseId, {
          rating: updatedCourse.rating,
          ratingCount: updatedCourse.ratingCount,
        });
      }

      // 4. Asynchronously send welcome / confirmation email to the student
      let recipientEmail = learnerEmail;
      if (!recipientEmail && connectionState.isConnected) {
        try {
          const user = await UserModel.findOne({ id: learnerId });
          if (user && user.email) {
            recipientEmail = user.email;
          }
        } catch {}
      }

      if (recipientEmail) {
        const courseTitle = event.payload.courseTitle || updatedCourse?.title || 'Your Course';
        await emailService.sendEmail({
          to: recipientEmail,
          subject: `Enrollment Confirmed: ${courseTitle}`,
          html: `<p>Congratulations! You are officially enrolled in <strong>${courseTitle}</strong> on EduSphere.</p><p>You can start learning immediately.</p>`,
          text: `Congratulations! You are officially enrolled in ${courseTitle} on EduSphere.`,
        }).catch((err) => {
          console.warn(`[EnrollmentSubscriber] Failed to send confirmation email:`, err?.message);
        });
      }
    } catch (err: any) {
      console.error(`[EnrollmentSubscriber Error] Event: ${event.eventId}`, err?.message || err);
    }
  });
}
