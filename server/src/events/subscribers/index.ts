import { registerEnrollmentSubscribers } from './enrollmentSubscribers';
import { registerCourseSubscribers } from './courseSubscribers';

export function registerAllSubscribers(): void {
  registerEnrollmentSubscribers();
  registerCourseSubscribers();
  console.log('📡 [EventBus] Enterprise event subscribers successfully registered.');
}
