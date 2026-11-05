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
  Laptop,
  CheckCircle2,
  Lock
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

  // Reviews State (WEB-10)
  const [reviews, setReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
        const [courseRes, myCoursesRes, reviewsRes] = await Promise.all([
          api.getCourse(selectedCourseId),
          currentUser ? api.getMyCourses() : Promise.resolve({ enrollments: [] as any[] }),
          api.getCourseReviews(selectedCourseId).catch(() => ({ reviews: [] }))
        ]);

        if (!isMounted) return;

        setCourse(courseRes.course);
        setExpandedModule(courseRes.course?.modules?.[0]?.id ?? null);
        setReviews(reviewsRes.reviews || []);

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
          <p style={{ color: 'var(--slate-500)', fontSize: '0.92rem' }}>
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

        {/* Clean Enterprise Academic Course Header */}
        <section style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-color)',
          padding: '40px 24px 36px',
        }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            {/* Back Navigation Breadcrumb */}
            <button
              onClick={() => setCurrentPage('landing')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--slate-100)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                color: 'var(--navy-900)',
                cursor: 'pointer',
                marginBottom: 20,
                fontSize: '0.82rem',
                fontWeight: 600,
                transition: 'background-color 0.15s ease',
              }}
            >
              <ArrowLeft size={14} /> Back to Catalog
            </button>

            <div className="course-detail-header-grid">
              <div>
                {/* Category & Level Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{
                    backgroundColor: 'var(--slate-100)',
                    color: 'var(--navy-900)',
                    border: '1px solid var(--border-color)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {course.category}
                  </span>

                  <span style={{
                    backgroundColor: 'var(--slate-100)',
                    color: 'var(--slate-700)',
                    border: '1px solid var(--border-color)',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}>
                    {course.level}
                  </span>

                  <span style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                    <ShieldCheck size={13} /> Accredited Curriculum
                  </span>
                </div>

                {/* Title & Tagline */}
                <h1 style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: 'var(--navy-950)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                  marginBottom: 12,
                }}>
                  {course.title}
                </h1>

                <p style={{
                  fontSize: '1rem',
                  color: 'var(--slate-600)',
                  lineHeight: 1.6,
                  marginBottom: 20,
                  maxWidth: 720,
                }}>
                  {course.tagline}
                </p>

                {/* Badges / Metrics Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: '0.84rem',
                  color: 'var(--slate-600)',
                  paddingTop: 16,
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#D97706' }}>
                    <Star size={15} fill="#F59E0B" color="#F59E0B" />
                    <span>{course.rating.toFixed(1)}</span>
                    <span style={{ color: 'var(--slate-400)', fontWeight: 500 }}>
                      ({course.ratingCount} evaluations)
                    </span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Users size={15} color="var(--primary)" />
                    <span>{course.enrolledCount.toLocaleString()} Enrolled</span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={15} color="var(--primary)" />
                    <span>{course.durationHours} Hours Self-Paced</span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Award size={15} color="#10B981" />
                    <span>SHA-256 Verifiable Diploma</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Body Layout with Responsive Columns */}
        <div style={{ maxWidth: 1240, margin: '32px auto 0', padding: '0 24px' }}>
          <div className="course-detail-main-grid">
            {/* Left Column: Segmented Tabs & Content */}
            <div>
              {/* Tabs Navigation */}
              <div style={{
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid var(--border-color)',
                marginBottom: 28,
                overflowX: 'auto',
              }}>
                {(['overview', 'curriculum', 'instructor', 'reviews'] as const).map(tab => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '10px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                        color: isActive ? 'var(--primary)' : 'var(--slate-500)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.9rem',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        marginBottom: -1,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Description Card */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-xs)',
                  }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 10 }}>
                      Course Syllabus Overview
                    </h3>
                    <p style={{ color: 'var(--slate-700)', lineHeight: 1.65, fontSize: '0.92rem', margin: 0 }}>
                      {course.description}
                    </p>
                  </div>

                  {/* Key Features Chips */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 14,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-xs)',
                    }}>
                      <div style={{
                        padding: 8,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--slate-100)',
                        color: 'var(--primary)',
                      }}>
                        <Clock size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)' }}>Self-Paced Learning</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>Learn on your schedule</div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-xs)',
                    }}>
                      <div style={{
                        padding: 8,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--slate-100)',
                        color: '#10B981',
                      }}>
                        <Award size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)' }}>Verifiable Credential</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>Cryptographic SHA-256 seal</div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-xs)',
                    }}>
                      <div style={{
                        padding: 8,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--slate-100)',
                        color: 'var(--navy-900)',
                      }}>
                        <Laptop size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)' }}>Multi-Device Access</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>Mobile, desktop & tablet</div>
                      </div>
                    </div>
                  </div>

                  {/* What You'll Learn Grid */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-xs)',
                  }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 16 }}>
                      Target Competencies & Learning Outcomes
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: 12,
                    }}>
                      {course.learningOutcomes?.map((outcome, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '10px 12px',
                          backgroundColor: 'var(--slate-50)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                        }}>
                          <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ color: 'var(--slate-700)', fontSize: '0.86rem', lineHeight: 1.5, fontWeight: 500 }}>
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
                    marginBottom: 18,
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                        Structured Curriculum
                      </h3>
                      <p style={{ color: 'var(--slate-500)', fontSize: '0.84rem', marginTop: 2, margin: 0 }}>
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
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {expandedModule === 'all' ? 'Collapse All' : 'Expand All'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {course.modules?.map((module, mIdx) => {
                      const isExpanded = expandedModule === 'all' || expandedModule === module.id;
                      return (
                        <div
                          key={module.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-xs)',
                          }}
                        >
                          {/* Module Header Bar */}
                          <div
                            onClick={() => setExpandedModule(current => {
                              if (current === 'all') return module.id;
                              return isExpanded ? null : module.id;
                            })}
                            style={{
                              padding: '14px 18px',
                              backgroundColor: isExpanded ? 'var(--slate-50)' : '#FFFFFF',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              fontWeight: 700,
                              userSelect: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--slate-100)',
                                color: 'var(--navy-900)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                              <span style={{ fontSize: '0.94rem', color: 'var(--navy-950)' }}>
                                Module {mIdx + 1}: {module.title}
                              </span>
                            </div>

                            <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                              {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                            </span>
                          </div>

                          {/* Lesson Items Accordion Body */}
                          {isExpanded && (
                            <div style={{
                              padding: '4px 18px 14px',
                              backgroundColor: '#FFFFFF',
                              borderTop: '1px solid var(--border-subtle)',
                            }}>
                              {module.lessons.map(lesson => (
                                <div
                                  key={lesson.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    fontSize: '0.86rem',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {lesson.contentType === 'QUIZ' ? (
                                      <ShieldCheck size={16} color="var(--primary)" />
                                    ) : (
                                      <PlayCircle size={16} color="var(--primary)" />
                                    )}
                                    <span style={{ fontWeight: 600, color: 'var(--navy-950)' }}>
                                      {lesson.title}
                                    </span>
                                    {lesson.isFreePreview && (
                                      <span style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700 }}>
                                        Preview
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: 'var(--slate-500)', fontSize: '0.78rem', fontWeight: 500 }}>
                                      {lesson.durationMinutes} min
                                    </span>

                                    {lesson.contentType === 'QUIZ' ? (
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => {
                                          if (!currentUser) {
                                            setCurrentPage('login');
                                          } else {
                                            startExam('assessment-1');
                                          }
                                        }}
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
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px',
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80"
                      alt={course.instructorName}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                        {course.instructorName}
                      </h3>
                      <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem', margin: '2px 0 4px' }}>
                        Accredited Faculty Instructor
                      </p>
                      <p style={{ color: 'var(--slate-500)', fontSize: '0.82rem', margin: 0 }}>
                        {course.institutionName || 'Institutional Academic Network'}
                      </p>
                    </div>
                  </div>

                  <p style={{ color: 'var(--slate-700)', lineHeight: 1.65, fontSize: '0.92rem', margin: 0 }}>
                    {course.instructorName} is an accredited university faculty member and curriculum director specializing in modern software architecture, high-performance distributed systems, and scalable web platforms. With extensive academic tenure, they oversee structured curricula and verifiable assessments.
                  </p>
                </div>
              )}

              {/* TAB 4: REVIEWS (WEB-10) */}
              {activeTab === 'reviews' && (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px',
                  boxShadow: 'var(--shadow-xs)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    marginBottom: 24,
                    flexWrap: 'wrap',
                  }}>
                    <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--navy-950)', lineHeight: 1 }}>
                      {course.rating || 5.0}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: 3, color: '#F59E0B', marginBottom: 4 }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={18} fill={i < Math.round(course.rating || 5) ? '#F59E0B' : 'none'} color="#F59E0B" />
                        ))}
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--slate-500)' }}>
                        Overall Course Rating • Based on {course.ratingCount || reviews.length || 1} verified evaluations
                      </div>
                    </div>
                  </div>

                  {/* Submit Review Form (Enrolled Students Only) */}
                  {isEnrolled && (
                    <div style={{
                      backgroundColor: 'var(--slate-50)',
                      padding: '18px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      marginBottom: 24,
                    }}>
                      <h4 style={{ fontWeight: 700, color: 'var(--navy-950)', fontSize: '0.92rem', marginBottom: 4 }}>
                        Submit Your Course Evaluation
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginBottom: 12 }}>
                        Share your feedback to assist fellow scholars in evaluating syllabus quality.
                      </p>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newComment.trim()) return;
                        setIsSubmittingReview(true);
                        try {
                          const res = await api.submitCourseReview(course.id, newRating, newComment.trim());
                          setReviews([res.review, ...reviews]);
                          setNewComment('');
                          showToast({ title: 'Review published', description: 'Thank you for evaluating this curriculum!', tone: 'success' });
                        } catch (err: any) {
                          showToast({ title: 'Submission failed', description: err.message, tone: 'error' });
                        } finally {
                          setIsSubmittingReview(false);
                        }
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy-950)' }}>Your Rating:</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewRating(star)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                              >
                                <Star size={18} fill={star <= newRating ? '#F59E0B' : 'none'} color="#F59E0B" />
                              </button>
                            ))}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D97706' }}>{newRating} / 5 Stars</span>
                        </div>

                        <textarea
                          rows={3}
                          required
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          placeholder="Write feedback regarding lesson quality, interactive labs, and instruction clarity..."
                          className="input-field"
                          style={{ fontSize: '0.86rem', marginBottom: 10, resize: 'vertical' }}
                        />

                        <Button variant="primary" size="sm" type="submit" disabled={isSubmittingReview}>
                          {isSubmittingReview ? 'Publishing...' : 'Publish Review'}
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
                    {reviews.length === 0 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-950)' }}>
                            Verified Scholar Evaluation
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Recent Graduate</span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--slate-700)', lineHeight: 1.55, margin: 0 }}>
                          "The hands-on lessons, clear curriculum structure, and live coding sessions made algorithmic concepts practical and accessible. The cryptographic certificate verification is an exceptional standard."
                        </p>
                      </div>
                    ) : (
                      reviews.map((rev: any) => (
                        <div key={rev.id || rev._id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy-950)' }}>
                                {rev.userName}
                              </span>
                              <div style={{ display: 'flex', gap: 2 }}>
                                {[...Array(rev.rating || 5)].map((_, i) => (
                                  <Star key={i} size={13} fill="#F59E0B" color="#F59E0B" />
                                ))}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)' }}>
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.88rem', color: 'var(--slate-700)', lineHeight: 1.55, margin: 0 }}>
                            "{rev.comment}"
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Enrollment Card */}
            <div style={{
              position: 'sticky',
              top: 80,
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                marginBottom: 16,
                position: 'relative',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--slate-100)',
              }}>
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                }}>
                  <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#FFFFFF', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {course.level}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Offered by</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy-950)', marginTop: 2 }}>
                  {course.institutionName || 'Institutional Partner'}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '12px 0 14px',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: 14,
              }}>
                <span style={{ color: 'var(--slate-600)', fontSize: '0.86rem', fontWeight: 600 }}>Tuition</span>
                <span style={{ fontWeight: 800, color: 'var(--navy-950)', fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
                  {course.price === 0 ? 'Free' : `$${course.price}`}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 8, padding: '0 0 14px' }}>
                {[
                  'Structured curriculum with verifiable milestones',
                  'Cryptographic SHA-256 completion diploma',
                  'Self-paced access across mobile, tablet, and desktop',
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.82rem',
                      color: 'var(--slate-600)',
                      lineHeight: 1.45,
                    }}
                  >
                    <CheckCircle size={14} color="#10B981" style={{ flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {enrollMsg && (
                <div style={{
                  backgroundColor: '#F0FDF4',
                  color: '#166534',
                  border: '1px solid #BBF7D0',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <CheckCircle size={15} color="#166534" />
                  <span>{enrollMsg}</span>
                </div>
              )}

              <Button
                onClick={isEnrolled ? () => setCurrentPage('my-courses') : handleEnroll}
                variant="primary"
                size="md"
                isLoading={isEnrolling}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isEnrolled ? 'Go to My Courses' : 'Enroll Now'}
              </Button>

              <Button
                onClick={() => {
                  if (!currentUser) {
                    setCurrentPage('login');
                  } else {
                    startExam('assessment-1');
                  }
                }}
                variant="secondary"
                size="md"
                style={{ width: '100%', marginTop: 8, justifyContent: 'center', gap: 6 }}
              >
                <ShieldCheck size={15} /> Proctored Midterm Exam
              </Button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 14,
                fontSize: '0.76rem',
                color: 'var(--slate-500)',
              }}>
                <Lock size={12} color="var(--slate-400)" />
                <span>Verified accredited learning portal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
