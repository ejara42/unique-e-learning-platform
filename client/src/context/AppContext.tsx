import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, UserRole } from '../types';
import { api } from '../api';
import { LanguageCode, translations, TranslationDict } from '../i18n';

export type AppPage =
  | 'landing'
  | 'login'
  | 'register'
  | 'learner-dashboard'
  | 'course-detail'
  | 'my-courses'
  | 'teacher-studio'
  | 'institution-register'
  | 'admin-dashboard'
  | 'live-classroom'
  | 'lesson-player'
  | 'exam-player'
  | 'certificate-verify';

interface AppContextType {
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  currentUser: IUser | null;
  setCurrentUser: (user: IUser | null) => void;
  selectedCourseId: string | null;
  setSelectedCourseId: (id: string | null) => void;
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;
  selectedAssessmentId: string | null;
  setSelectedAssessmentId: (id: string | null) => void;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  activeLiveSessionId: string | null;
  setActiveLiveSessionId: (id: string | null) => void;

  // Dynamic Authentication
  loginUser: (email: string, pass: string) => Promise<void>;
  registerUser: (fullName: string, email: string, pass: string, role: UserRole, institutionName?: string) => Promise<void>;
  switchUserRole: (role: UserRole) => Promise<void>;
  logoutUser: () => void;

  // Navigation shortcuts
  openCourse: (courseId: string) => void;
  openLesson: (lessonId: string) => void;
  startExam: (assessmentId: string) => void;
  openLiveClass: (sessionId: string) => void;
  openVerification: (certCode: string) => void;

  // Multi-Lingual & Accessibility
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TranslationDict;
  fontScale: number;
  zoomFont: () => void;
  decreaseFont: () => void;
  resetFont: () => void;
  setFontScale: (scale: number) => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  isRTL: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<AppPage>('landing');
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [activeLiveSessionId, setActiveLiveSessionId] = useState<string | null>(null);

  // Multi-Lingual & Accessibility State
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [fontScale, setFontScaleState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('edusphere_font_scale');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.8 && val <= 1.4) return val;
      }
    } catch {
      // fallback
    }
    return 1.0;
  });
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Directly adjust root html font-size so EVERY element using rem units instantly resizes in real-time
  useEffect(() => {
    const baseFontSize = 16;
    const computedPx = `${Math.round(baseFontSize * fontScale * 10) / 10}px`;
    document.documentElement.style.fontSize = computedPx;
    try {
      localStorage.setItem('edusphere_font_scale', fontScale.toString());
    } catch {
      // ignore
    }
  }, [fontScale]);

  // High contrast mode toggle on html root element
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
    }
  }, [highContrast]);

  useEffect(() => {
    // Check saved language
    const savedLang = localStorage.getItem('edusphere_lang') as LanguageCode;
    if (savedLang && translations[savedLang]) {
      setLanguageState(savedLang);
    }

    // Check if user has an active session token (DO NOT auto-login as hardcoded names!)
    const token = localStorage.getItem('edusphere_token');
    if (token) {
      api.getMe()
        .then(res => {
          if (res?.user) {
            setCurrentUser(res.user);
          }
        })
        .catch(() => {
          localStorage.removeItem('edusphere_token');
          setCurrentUser(null);
        });
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('edusphere_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const isRTL = language === 'ar';

  const zoomFont = () => {
    setFontScaleState(prev => {
      const next = Math.round((prev + 0.1) * 10) / 10;
      return next > 1.4 ? 1.4 : next;
    });
  };

  const decreaseFont = () => {
    setFontScaleState(prev => {
      const next = Math.round((prev - 0.1) * 10) / 10;
      return next < 0.8 ? 0.8 : next;
    });
  };

  const resetFont = () => {
    setFontScaleState(1.0);
  };

  const setFontScale = (scale: number) => {
    const clamped = Math.max(0.8, Math.min(1.4, Math.round(scale * 10) / 10));
    setFontScaleState(clamped);
  };

  const toggleHighContrast = () => {
    setHighContrast(prev => !prev);
  };

  // Dynamic Login
  const loginUser = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setCurrentUser(res.user);
    if (res.user.activeRole === 'PLATFORM_ADMIN' || res.user.activeRole === 'INSTITUTION_ADMIN') {
      setCurrentPage('admin-dashboard');
    } else if (res.user.activeRole === 'INSTRUCTOR') {
      setCurrentPage('teacher-studio');
    } else {
      setCurrentPage('learner-dashboard');
    }
  };

  // Dynamic Registration
  const registerUser = async (
    fullName: string,
    email: string,
    pass: string,
    role: UserRole,
    institutionName?: string
  ) => {
    const res = await api.register(fullName, email, pass, role);
    setCurrentUser(res.user);
    if (res.user.activeRole === 'INSTRUCTOR') {
      setCurrentPage('teacher-studio');
    } else {
      setCurrentPage('learner-dashboard');
    }
  };

  const switchUserRole = async (role: UserRole) => {
    if (!currentUser) return;
    try {
      const res = await api.switchRole(role);
      setCurrentUser(res.user);
      if (role === 'PLATFORM_ADMIN' || role === 'INSTITUTION_ADMIN') {
        setCurrentPage('admin-dashboard');
      } else if (role === 'INSTRUCTOR') {
        setCurrentPage('teacher-studio');
      } else {
        setCurrentPage('learner-dashboard');
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    }
  };

  const logoutUser = () => {
    api.logout();
    setCurrentUser(null);
    setCurrentPage('landing');
  };

  const openCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId(null);
    setCurrentPage('course-detail');
  };

  const openLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setCurrentPage('lesson-player');
  };

  const startExam = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setCurrentPage('exam-player');
  };

  const openLiveClass = (sessionId: string) => {
    setActiveLiveSessionId(sessionId);
    setCurrentPage('live-classroom');
  };

  const openVerification = (certCode: string) => {
    setVerificationCode(certCode);
    setCurrentPage('certificate-verify');
  };

  const t = translations[language] || translations.en;

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        currentUser,
        setCurrentUser,
        selectedCourseId,
        setSelectedCourseId,
        selectedLessonId,
        setSelectedLessonId,
        selectedAssessmentId,
        setSelectedAssessmentId,
        verificationCode,
        setVerificationCode,
        activeLiveSessionId,
        setActiveLiveSessionId,
        loginUser,
        registerUser,
        switchUserRole,
        logoutUser,
        openCourse,
        openLesson,
        startExam,
        openLiveClass,
        openVerification,
        language,
        setLanguage,
        t,
        fontScale,
        zoomFont,
        decreaseFont,
        resetFont,
        setFontScale,
        highContrast,
        toggleHighContrast,
        isRTL,
      }}
    >
      <div
        style={{
          filter: highContrast ? 'contrast(125%)' : 'none',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {children}
      </div>
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
