import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { LearnerDashboard } from './pages/LearnerDashboard';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { TeacherCourseStudio } from './pages/TeacherCourseStudio';
import { InstitutionRegisterPage } from './pages/InstitutionRegisterPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveClassroomPage } from './pages/LiveClassroomPage';
import { LessonPlayerPage } from './pages/LessonPlayerPage';
import { AssessmentExamPlayer } from './pages/AssessmentExamPlayer';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage';
import { RoleGuard } from './components/RoleGuard';

export const App: React.FC = () => {
  const { currentPage } = useApp();

  const isDistractionFree = currentPage === 'live-classroom' || currentPage === 'exam-player';
  const isAuthPage = currentPage === 'login' || currentPage === 'register';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isDistractionFree && !isAuthPage && <Header />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentPage === 'landing' && <LandingPage />}
        {currentPage === 'login' && <AuthPage initialMode="signin" />}
        {currentPage === 'register' && <AuthPage initialMode="signup" />}
        {currentPage === 'learner-dashboard' && (
          <RoleGuard
            allowedRoles={['STUDENT', 'INDEPENDENT_LEARNER', 'INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
            workspaceName="Student Learning Workspace"
            description="Access your enrolled courses, active learning progress, upcoming live sessions, and earned credentials."
          >
            <LearnerDashboard />
          </RoleGuard>
        )}
        {currentPage === 'course-detail' && <CourseDetailPage />}
        {currentPage === 'my-courses' && (
          <RoleGuard
            allowedRoles={['STUDENT', 'INDEPENDENT_LEARNER', 'INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
            workspaceName="My Course Portfolio"
            description="View and continue your enrolled programs and completed certifications."
          >
            <MyCoursesPage />
          </RoleGuard>
        )}
        {currentPage === 'teacher-studio' && (
          <RoleGuard
            allowedRoles={['INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
            workspaceName="Course Authoring & Curriculum Studio"
            description="Design curricula, upload video/document lessons, configure proctored assessments, and manage course enrollments."
          >
            <TeacherCourseStudio />
          </RoleGuard>
        )}
        {currentPage === 'institution-register' && <InstitutionRegisterPage />}
        {currentPage === 'admin-dashboard' && (
          <RoleGuard
            allowedRoles={['INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
            workspaceName="Platform & Institutional Administration Console"
            description="Manage multi-tenant institutions, review student admissions, approve course offerings, and audit security telemetry."
          >
            <AdminDashboard />
          </RoleGuard>
        )}
        {currentPage === 'live-classroom' && <LiveClassroomPage />}
        {currentPage === 'lesson-player' && <LessonPlayerPage />}
        {currentPage === 'exam-player' && <AssessmentExamPlayer />}
        {currentPage === 'certificate-verify' && <CertificateVerifyPage />}
      </div>

      {!isDistractionFree && !isAuthPage && <Footer />}
    </div>
  );
};
