import { eventBus, DomainEvent } from '../eventBus';
import { CourseModel, CourseReviewModel } from '../../models';
import { cacheService } from '../../cache/cacheService';
import { searchService } from '../../search/searchService';
import { connectionState } from '../../data/mongoConnection';
import { ICourse } from '../../types';

export interface CourseCreatedPayload extends ICourse {}

export interface CourseUpdatedPayload {
  courseId: string;
  updates: Partial<ICourse>;
}

export interface ReviewSubmittedPayload {
  courseId: string;
  reviewId: string;
  rating: number;
  userId: string;
}

export function registerCourseSubscribers(): void {
  // COURSE_CREATED
  eventBus.subscribe<CourseCreatedPayload>('COURSE_CREATED', async (event: DomainEvent<CourseCreatedPayload>) => {
    try {
      const course = event.payload;
      await cacheService.invalidateByTag('courses:catalog');

      if (course.isPublished) {
        await searchService.indexCourse({
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
    } catch (err: any) {
      console.error(`[CourseSubscriber Error - COURSE_CREATED]`, err?.message || err);
    }
  });

  // COURSE_UPDATED
  eventBus.subscribe<CourseUpdatedPayload>('COURSE_UPDATED', async (event: DomainEvent<CourseUpdatedPayload>) => {
    try {
      const { courseId, updates } = event.payload;
      await cacheService.invalidateByTag('courses:catalog');
      await cacheService.invalidateByTag(`course:${courseId}`);

      await searchService.updateCourse(courseId, {
        ...(updates.title && { title: updates.title }),
        ...(updates.category && { category: updates.category }),
        ...(updates.level && { level: updates.level }),
        ...(typeof updates.price === 'number' && { price: updates.price }),
        ...(typeof updates.rating === 'number' && { rating: updates.rating }),
        ...(typeof updates.ratingCount === 'number' && { ratingCount: updates.ratingCount }),
        ...(typeof updates.isPublished === 'boolean' && { isPublished: updates.isPublished }),
      });
    } catch (err: any) {
      console.error(`[CourseSubscriber Error - COURSE_UPDATED]`, err?.message || err);
    }
  });

  // REVIEW_SUBMITTED
  eventBus.subscribe<ReviewSubmittedPayload>('REVIEW_SUBMITTED', async (event: DomainEvent<ReviewSubmittedPayload>) => {
    try {
      const { courseId } = event.payload;
      let allReviews: any[] = [];
      if (connectionState.isConnected) {
        try {
          allReviews = await CourseReviewModel.find({ courseId });
        } catch (dbErr: any) {
          console.warn(`[CourseSubscriber] Could not fetch reviews from db: ${dbErr?.message}`);
        }
      }

      if (allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const roundedRating = Math.round(avgRating * 10) / 10;
        const ratingCount = allReviews.length;

        if (connectionState.isConnected) {
          try {
            await CourseModel.findOneAndUpdate(
              { id: courseId },
              { rating: roundedRating, ratingCount }
            );
          } catch {}
        }

        await cacheService.invalidateByTag(`course:${courseId}`);
        await cacheService.invalidateByTag('courses:catalog');

        await searchService.updateCourse(courseId, {
          rating: roundedRating,
          ratingCount,
        });
      }
    } catch (err: any) {
      console.error(`[CourseSubscriber Error - REVIEW_SUBMITTED]`, err?.message || err);
    }
  });
}
