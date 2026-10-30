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
import { AssessmentExamPlayer } from './pages/AssessmentExamPlayer';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage';

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
        {currentPage === 'learner-dashboard' && <LearnerDashboard />}
        {currentPage === 'course-detail' && <CourseDetailPage />}
        {currentPage === 'my-courses' && <MyCoursesPage />}
        {currentPage === 'teacher-studio' && <TeacherCourseStudio />}
        {currentPage === 'institution-register' && <InstitutionRegisterPage />}
        {currentPage === 'admin-dashboard' && <AdminDashboard />}
        {currentPage === 'live-classroom' && <LiveClassroomPage />}
        {currentPage === 'exam-player' && <AssessmentExamPlayer />}
        {currentPage === 'certificate-verify' && <CertificateVerifyPage />}
      </div>

      {!isDistractionFree && !isAuthPage && <Footer />}
    </div>
  );
};
