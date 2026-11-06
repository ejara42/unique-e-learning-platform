import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { RoleGuard } from './components/RoleGuard';

const LandingPage = React.lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const LearnerDashboard = React.lazy(() => import('./pages/LearnerDashboard').then(module => ({ default: module.LearnerDashboard })));
const CourseDetailPage = React.lazy(() => import('./pages/CourseDetailPage').then(module => ({ default: module.CourseDetailPage })));
const MyCoursesPage = React.lazy(() => import('./pages/MyCoursesPage').then(module => ({ default: module.MyCoursesPage })));
const TeacherCourseStudio = React.lazy(() => import('./pages/TeacherCourseStudio').then(module => ({ default: module.TeacherCourseStudio })));
const InstitutionRegisterPage = React.lazy(() => import('./pages/InstitutionRegisterPage').then(module => ({ default: module.InstitutionRegisterPage })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const LiveClassroomPage = React.lazy(() => import('./pages/LiveClassroomPage').then(module => ({ default: module.LiveClassroomPage })));
const LessonPlayerPage = React.lazy(() => import('./pages/LessonPlayerPage').then(module => ({ default: module.LessonPlayerPage })));
const AssessmentExamPlayer = React.lazy(() => import('./pages/AssessmentExamPlayer').then(module => ({ default: module.AssessmentExamPlayer })));
const CertificateVerifyPage = React.lazy(() => import('./pages/CertificateVerifyPage').then(module => ({ default: module.CertificateVerifyPage })));

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or return to the homepage.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const NotFoundPage: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div style={{ padding: '72px 20px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: 12 }}>Page not found</h2>
      <p style={{ marginBottom: 18, color: '#64748B' }}>The route you requested does not exist.</p>
      <button className="btn btn-primary" type="button" onClick={() => setCurrentPage('landing')}>
        Return home
      </button>
    </div>
  );
};

export const App: React.FC = () => {
  const location = useLocation();

  const isDistractionFree =
    location.pathname === '/live-classroom' ||
    location.pathname.startsWith('/exams/') ||
    location.pathname.startsWith('/lessons/');

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isDistractionFree && !isAuthPage && <Header />}

      <div id="main-content" tabIndex={-1} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppErrorBoundary>
          <React.Suspense fallback={<div style={{ padding: '48px 20px', textAlign: 'center', color: '#475569' }}>Loading EduSphere…</div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage initialMode="signin" />} />
              <Route path="/register" element={<AuthPage initialMode="signup" />} />

              <Route
                path="/dashboard"
                element={
                  <RoleGuard
                    allowedRoles={['STUDENT', 'INDEPENDENT_LEARNER', 'INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
                    workspaceName="Student Learning Workspace"
                    description="Access your enrolled courses, active learning progress, upcoming live sessions, and earned credentials."
                  >
                    <LearnerDashboard />
                  </RoleGuard>
                }
              />

              <Route path="/courses" element={<CourseDetailPage />} />
              <Route path="/courses/:courseId" element={<CourseDetailPage />} />

              <Route
                path="/my-courses"
                element={
                  <RoleGuard
                    allowedRoles={['STUDENT', 'INDEPENDENT_LEARNER', 'INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
                    workspaceName="My Course Portfolio"
                    description="View and continue your enrolled programs and completed certifications."
                  >
                    <MyCoursesPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/teacher-studio"
                element={
                  <RoleGuard
                    allowedRoles={['INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
                    workspaceName="Course Authoring & Curriculum Studio"
                    description="Design curricula, upload video/document lessons, configure proctored assessments, and manage course enrollments."
                  >
                    <TeacherCourseStudio />
                  </RoleGuard>
                }
              />

              <Route path="/institution/register" element={<InstitutionRegisterPage />} />

              <Route
                path="/admin"
                element={
                  <RoleGuard
                    allowedRoles={['INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
                    workspaceName="Platform & Institutional Administration Console"
                    description="Manage multi-tenant institutions, review student admissions, approve course offerings, and audit security telemetry."
                  >
                    <AdminDashboard />
                  </RoleGuard>
                }
              />

              <Route
                path="/live-classroom"
                element={
                  <RoleGuard
                    allowedRoles={['STUDENT', 'INDEPENDENT_LEARNER', 'INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
                    workspaceName="Interactive Live Virtual Classroom"
                    description="Live WebRTC video conferencing, interactive whiteboard, and attendance telemetry require candidate authentication."
                  >
                    <LiveClassroomPage />
                  </RoleGuard>
                }
              />

              <Route path="/lessons/:lessonId" element={<LessonPlayerPage />} />

              <Route
                path="/exams/:assessmentId"
                element={
                  <RoleGuard
                    allowedRoles={['STUDENT', 'INDEPENDENT_LEARNER', 'INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN']}
                    workspaceName="Proctored Assessment & Exam Stage"
                    description="Official proctored examinations and credential-issuing assessments require verified candidate authentication."
                  >
                    <AssessmentExamPlayer />
                  </RoleGuard>
                }
              />

              <Route path="/verify-certificate" element={<CertificateVerifyPage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </React.Suspense>
        </AppErrorBoundary>
      </div>

      {!isDistractionFree && !isAuthPage && <Footer />}
    </div>
  );
};
