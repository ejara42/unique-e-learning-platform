import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICourse } from '../types';
import {
  Star,
  Clock,
  Users,
  CheckCircle,
  PlayCircle,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Share2,
  Bookmark,
  Sparkles,
  Laptop
} from 'lucide-react';
import { Button, Badge, ToastViewport, useToast } from '../components/ui';

export const CourseDetailPage: React.FC = () => {
  const { selectedCourseId, setCurrentPage, startExam, openLesson, currentUser } = useApp();
  const { toast, showToast, dismissToast } = useToast();
  const [course, setCourse] = useState<ICourse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'instructor' | 'reviews'>('overview');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCourseId) {
      setCourse(null);
      setLoadError('No course selected.');
      setIsEnrolled(false);
      setExpandedModule(null);
      return;
    }

    let isMounted = true;

    const loadCourse = async () => {
      setCourse(null);
      setLoadError(null);
      setEnrollMsg('');

      try {
        const [courseRes, myCoursesRes] = await Promise.all([
          api.getCourse(selectedCourseId),
          currentUser ? api.getMyCourses() : Promise.resolve({ enrollments: [] as any[] })
        ]);

        if (!isMounted) return;

        setCourse(courseRes.course);
        setExpandedModule(courseRes.course?.modules?.[0]?.id ?? null);

        if (currentUser) {
          const found = myCoursesRes.enrollments?.some((e: any) => e.courseId === selectedCourseId);
          setIsEnrolled(Boolean(found));
        } else {
          setIsEnrolled(false);
        }
      } catch (error: any) {
        if (!isMounted) return;
        setCourse(null);
        setLoadError(error?.message || 'Unable to load this course right now.');
      }
    };

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId, currentUser]);

  useEffect(() => {
    if (!course?.modules?.length) {
      setExpandedModule(null);
      return;
    }

    setExpandedModule(current => {
      if (current === 'all') return 'all';
      if (current && course.modules.some(module => module.id === current)) return current;
      return course.modules[0].id;
    });
  }, [course]);

  if (!course) {
    return (
      <>
        <ToastViewport toast={toast} onDismiss={dismissToast} />
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 40
        }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {loadError || 'Loading course curriculum and syllabus...'}
          </p>
        </div>
      </>
    );
  }

  const handleEnroll = async () => {
    if (!currentUser) {
      setCurrentPage('login');
      return;
    }
    setIsEnrolling(true);
    try {
      if (course.price && course.price > 0) {
        showToast({ title: 'Redirecting to checkout', description: 'Initializing secure Stripe checkout session...', tone: 'info' });
        const res = await api.createCheckoutSession(
          course.id,
          `${window.location.origin}/?payment=success&courseId=${course.id}`,
          `${window.location.origin}/?payment=cancelled&courseId=${course.id}`
        );
        if (res.session?.paymentUrl) {
          window.location.href = res.session.paymentUrl;
          return;
        }
      }

      await api.enroll(course.id);
      setIsEnrolled(true);
      setEnrollMsg('Successfully enrolled in course!');
      showToast({ title: 'Enrolled successfully', description: `You have successfully enrolled in ${course.title}.`, tone: 'success' });
    } catch (e: any) {
      setEnrollMsg(e.message || 'Already enrolled');
      showToast({ title: 'Enrollment notice', description: e.message || 'Enrollment request not processed.', tone: 'warning' });
    } finally {
      setIsEnrolling(false);
    }
  };

  const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;

  return (
    <>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
      <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Premium Navy Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 60%, var(--navy-800) 100%)',
        color: '#FFFFFF',
        padding: '48px 24px',
        borderBottom: '1px solid var(--navy-800)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Back Navigation Breadcrumb */}
          <button
            onClick={() => setCurrentPage('landing')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              padding: '6px 14px',
              color: '#CBD5E1',
              cursor: 'pointer',
              marginBottom: 24,
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#CBD5E1';
            }}
          >
            <ArrowLeft size={16} /> Back to Course Catalog
          </button>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.6fr)',
            gap: 48,
            alignItems: 'center',
          }}>
            <div>
              {/* Category & Verified Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{
                  backgroundColor: 'rgba(79, 70, 229, 0.25)',
                  border: '1px solid rgba(129, 140, 248, 0.4)',
                  color: '#A5B4FC',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {course.category}
                </span>

                <span style={{
                  backgroundColor: 'rgba(13, 148, 136, 0.2)',
                  border: '1px solid rgba(20, 184, 166, 0.4)',
                  color: '#5EEAD4',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <ShieldCheck size={14} /> Ministry Accredited
                </span>
              </div>

              {/* Title & Tagline */}
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
                marginBottom: 14,
              }}>
                {course.title}
              </h1>

              <p style={{
                fontSize: '1.05rem',
                color: '#CBD5E1',
                lineHeight: 1.6,
                marginBottom: 24,
                maxWidth: 720,
              }}>
                {course.tagline}
              </p>

              {/* Badges / Metrics Bar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.88rem',
                color: '#CBD5E1',
                paddingTop: 18,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                {[
                  { icon: <Star size={16} fill="#FBBF24" color="#FBBF24" />, label: `${course.rating.toFixed(1)}`, meta: `(${(course.ratingCount / 1000).toFixed(1)}k evaluations)` },
                  { icon: <Users size={16} color="#A5B4FC" />, label: `${(course.enrolledCount / 1000).toFixed(1)}k Enrolled` },
                  { icon: <Clock size={16} color="#A5B4FC" />, label: `${course.durationHours} Hours Video` },
                  { icon: <Award size={16} color="#5EEAD4" />, label: 'Verified Diploma Included' },
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(148,163,184,0.25)',
                      borderRadius: 999,
                      padding: '7px 12px',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    {item.icon}
                    <span style={{ color: index === 0 ? '#FBBF24' : '#E2E8F0', fontWeight: index === 0 ? 800 : 600 }}>
                      {item.label}
                    </span>
                    {item.meta && <span style={{ color: '#94A3B8', fontWeight: 500 }}>{item.meta}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Body Layout with Responsive Columns */}
      <div style={{ maxWidth: 1240, margin: '36px auto 0', padding: '0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.6fr)',
          gap: 36,
          alignItems: 'flex-start',
        }}>
          {/* Left Column: Segmented Tabs & Tab Content */}
          <div>
            {/* Tabs Navigation */}
            <div style={{
              display: 'flex',
              gap: 8,
              borderBottom: '2px solid var(--border-color)',
              marginBottom: 32,
              overflowX: 'auto',
            }}>
              {(['overview', 'curriculum', 'instructor', 'reviews'] as const).map(tab => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '12px 18px',
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.95rem',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      marginBottom: -2,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Description Card */}
                <div className="card" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 12 }}>
                    Course Syllabus Overview
                  </h3>
                  <p style={{ color: 'var(--slate-700)', lineHeight: 1.7, fontSize: '0.96rem' }}>
                    {course.description}
                  </p>
                </div>

                {/* Key Features Chips */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 20px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-xs)',
                  }}>
                    <div style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy-950)' }}>Self-Paced Learning</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Learn on your schedule</div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 20px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-xs)',
                  }}>
                    <div style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--teal-50)',
                      color: 'var(--teal-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Award size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy-950)' }}>Verifiable Credential</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Cryptographic QR verification</div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 20px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-xs)',
                  }}>
                    <div style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#EEF2FF',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Laptop size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy-950)' }}>Universal Access</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Mobile, desktop & tablet</div>
                    </div>
                  </div>
                </div>

                {/* What You'll Learn Grid */}
                <div className="card" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 20 }}>
                    What You Will Master
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 16,
                  }}>
                    {course.learningOutcomes?.map((outcome, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 14px',
                        backgroundColor: 'var(--slate-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                      }}>
                        <CheckCircle size={18} color="var(--teal-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ color: 'var(--slate-800)', fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 500 }}>
                          {outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CURRICULUM */}
            {activeTab === 'curriculum' && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  flexWrap: 'wrap',
                  gap: 12,
                }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                      Course Curriculum
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 2 }}>
                      {course.modules?.length || 0} Modules • {totalLessons} Lessons total
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setExpandedModule(current => current === 'all' ? null : 'all');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {expandedModule === 'all' ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {course.modules?.map((module, mIdx) => {
                    const isExpanded = expandedModule === 'all' || expandedModule === module.id;
                    return (
                      <div
                        key={module.id}
                        className="card"
                        style={{
                          padding: 0,
                          overflow: 'hidden',
                          border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        {/* Module Header Bar */}
                        <div
                          onClick={() => setExpandedModule(current => {
                            if (current === 'all') return module.id;
                            return isExpanded ? null : module.id;
                          })}
                          style={{
                            padding: '16px 20px',
                            backgroundColor: isExpanded ? 'var(--slate-50)' : '#FFFFFF',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            fontWeight: 700,
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isExpanded ? 'var(--primary-light)' : 'var(--slate-100)',
                              color: isExpanded ? 'var(--primary)' : 'var(--slate-600)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </div>
                            <span style={{ fontSize: '0.98rem', color: 'var(--navy-950)' }}>
                              Module {mIdx + 1}: {module.title}
                            </span>
                          </div>

                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                          </span>
                        </div>

                        {/* Lesson Items Accordion Body */}
                        {isExpanded && (
                          <div style={{
                            padding: '4px 20px 16px',
                            backgroundColor: '#FFFFFF',
                            borderTop: '1px solid var(--border-color)',
                          }}>
                            {module.lessons.map(lesson => (
                              <div
                                key={lesson.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '14px 0',
                                  borderBottom: '1px solid var(--slate-100)',
                                  fontSize: '0.9rem',
                                  flexWrap: 'wrap',
                                  gap: 12,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  {lesson.contentType === 'QUIZ' ? (
                                    <ShieldCheck size={18} color="var(--primary)" />
                                  ) : (
                                    <PlayCircle size={18} color="var(--primary)" />
                                  )}
                                  <span style={{ fontWeight: 600, color: 'var(--navy-950)' }}>
                                    {lesson.title}
                                  </span>
                                  {lesson.isFreePreview && (
                                    <Badge variant="teal">Free Preview</Badge>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>
                                    {lesson.durationMinutes} min
                                  </span>

                                  {lesson.contentType === 'QUIZ' ? (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => startExam('assessment-1')}
                                    >
                                      Take Exam
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => openLesson(lesson.id)}
                                    >
                                      Watch
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: INSTRUCTOR */}
            {activeTab === 'instructor' && (
              <div className="card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80"
                    alt={course.instructorName}
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--primary-light)',
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>
                      {course.instructorName}
                    </h3>
                    <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>
                      Course Instructor
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                      Accredited Learning Partner Network
                    </p>
                  </div>
                </div>

                <p style={{ color: 'var(--slate-700)', lineHeight: 1.7, fontSize: '0.96rem' }}>
                  {course.instructorName} is an accredited university faculty member and curriculum director specializing in modern software architecture, high-performance distributed systems, and scalable web platforms. With over a decade of higher-education experience, they have trained tens of thousands of scholars globally.
                </p>
              </div>
            )}

            {/* TAB 4: REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="card" style={{ padding: 32 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  marginBottom: 28,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: '3.4rem', fontWeight: 800, color: 'var(--navy-950)', lineHeight: 1 }}>
                    4.8
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 4, color: '#F59E0B', marginBottom: 4 }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={20} fill="#F59E0B" />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      Overall Course Rating • Based on verified learner evaluations
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy-950)' }}>
                      Verified Learner
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>February 14, 2026</span>
                  </div>
                  <p style={{ fontSize: '0.92rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>
                    "The hands-on lessons and live coding sessions made algorithmic thinking feel intuitive and practical. The verified certificate is also an outstanding addition for my portfolio!"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Course Enrollment Card */}
          <div className="card" style={{
            position: 'sticky',
            top: 90,
            padding: 24,
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid rgba(79, 70, 229, 0.15)',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          }}>
            <div style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              marginBottom: 20,
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
            }}>
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                top: 12,
                left: 12,
              }}>
                <Badge variant="neutral">{course.level}</Badge>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Offered by</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: 6 }}>
                {course.institutionName || 'Institution Partner'}
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '16px 0 18px',
              borderTop: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: 18,
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>Tuition</span>
              <span style={{ fontWeight: 800, color: 'var(--teal-700)', fontSize: '1.6rem', letterSpacing: '-0.03em' }}>
                {course.price === 0 ? 'Free' : `$${course.price}`}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gap: 10,
              padding: '0 0 14px',
            }}>
              {[
                'Structured curriculum with guided milestones',
                'Certificate of completion and learner verification',
                'Flexible self-paced access across devices',
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.86rem',
                    color: 'var(--slate-700)',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: 'var(--teal-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CheckCircle size={12} color="var(--teal-600)" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {enrollMsg && (
              <div style={{
                backgroundColor: 'var(--teal-50)',
                color: 'var(--teal-800)',
                border: '1px solid var(--teal-200)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.86rem',
                fontWeight: 700,
                margin: '12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <CheckCircle size={16} color="var(--teal-600)" />
                <span>{enrollMsg}</span>
              </div>
            )}

            <Button
              onClick={isEnrolled ? () => setCurrentPage('my-courses') : handleEnroll}
              variant={isEnrolled ? 'teal' : 'primary'}
              size="lg"
              isLoading={isEnrolling}
              style={{
                width: '100%',
                marginTop: 12,
                justifyContent: 'center',
                boxShadow: '0 16px 30px -12px rgba(79, 70, 229, 0.5)',
              }}
            >
              {isEnrolled ? 'Go to My Courses' : 'Enroll Now'}
            </Button>

            <Button
              onClick={() => startExam('assessment-1')}
              variant="secondary"
              size="md"
              style={{ width: '100%', marginTop: 10, justifyContent: 'center', gap: 8 }}
            >
              <ShieldCheck size={16} /> Open Midterm Exam
            </Button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 18,
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}>
              <ShieldCheck size={14} color="var(--teal-600)" />
              <span>Full lifetime curriculum access & certificate</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
