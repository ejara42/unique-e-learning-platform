import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sidebar } from '../components/Sidebar';
import { IEnrollment, ICourse } from '../types';
import { StatCard, EmptyState, Button } from '../components/ui';
import {
  BookOpen,
  CheckCircle2,
  Award,
  TrendingUp,
  Play,
  Star,
  ArrowRight,
  Clock,
  Sparkles,
  Compass
} from 'lucide-react';

export const LearnerDashboard: React.FC = () => {
  const { currentUser, openCourse, setCurrentPage, openVerification, t } = useApp();
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [recommended, setRecommended] = useState<ICourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMyCourses().then(res => setEnrollments(res.enrollments || [])).catch(() => setEnrollments([])),
      api.getCourses().then(res => setRecommended((res.courses || []).slice(4, 7))).catch(() => setRecommended([])),
    ]).finally(() => setIsLoading(false));
  }, []);

  const enrolledCount = enrollments.length;
  const completedCount = enrollments.filter(e => e.status === 'COMPLETED' || e.progressPercentage === 100).length;
  const certificatesCount = completedCount;
  const activeCourse = enrollments.find(e => e.status !== 'COMPLETED' && (e.progressPercentage || 0) < 100);
  const avgProgress = activeCourse?.progressPercentage || (enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / enrollments.length)
    : 0);

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Welcome Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 30,
          padding: '24px 26px',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid rgba(79, 70, 229, 0.12)',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06), rgba(255,255,255,1) 42%, rgba(13,148,136,0.04))',
          boxShadow: '0 18px 25px -20px rgba(79, 70, 229, 0.6)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              <Sparkles size={14} />
              <span>Learner Workspace</span>
            </div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{t.welcome}, {currentUser?.fullName || t.roleStudent}</span>
              <span style={{ fontSize: '1.6rem' }}>👋</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 6, maxWidth: 640, lineHeight: 1.6 }}>
              Track your enrolled curriculum, continue learning from where you left off, and verify your credentials.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => setCurrentPage('my-courses')}
              leftIcon={<BookOpen size={16} />}
            >
              My Learning Path
            </Button>
            <Button
              variant="teal"
              onClick={() => openVerification('')}
              leftIcon={<Award size={16} />}
            >
              Verify Certificate
            </Button>
          </div>
        </div>

        {/* 4 KPI Cards (Matching Design Architecture) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 18,
          marginBottom: 36,
        }}>
          <StatCard
            label="Enrolled Courses"
            value={enrolledCount}
            icon={<BookOpen size={22} />}
            iconBgColor="var(--primary-light)"
            iconColor="var(--primary)"
            borderAccentColor="var(--primary)"
            subtext="Active in your portfolio"
          />
          <StatCard
            label="Completed"
            value={completedCount}
            icon={<CheckCircle2 size={22} />}
            iconBgColor="var(--teal-50)"
            iconColor="var(--teal-600)"
            borderAccentColor="var(--teal-600)"
            subtext="Curriculum finished"
          />
          <StatCard
            label="Certificates"
            value={certificatesCount}
            icon={<Award size={22} />}
            iconBgColor="var(--accent-purple-light)"
            iconColor="var(--accent-purple)"
            borderAccentColor="var(--accent-purple)"
            subtext="Verified credentials"
          />
          <StatCard
            label="Active Progress"
            value={`${avgProgress}%`}
            icon={<TrendingUp size={22} />}
            iconBgColor="var(--warning-light)"
            iconColor="var(--warning)"
            borderAccentColor="var(--warning)"
            subtext="Overall completion rate"
          />
        </div>

        {/* Continue Learning Section */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '-0.02em' }}>
                Continue Learning
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                Pick up where you left off in your enrolled courses
              </p>
            </div>
            {enrollments.length > 0 && (
              <button
                onClick={() => setCurrentPage('my-courses')}
                className="btn btn-ghost"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 700 }}
              >
                <span>View all</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {enrollments.length === 0 ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState
                  icon={<BookOpen size={32} />}
                  title="No courses enrolled yet"
                  description="Explore our accredited course catalog to enroll in foundational and advanced courses."
                  actionText="Explore Course Catalog"
                  onAction={() => setCurrentPage('landing')}
                  actionIcon={<Compass size={16} />}
                />
              </div>
            ) : (
              enrollments.slice(0, 4).map(enr => {
                const course = enr.course;
                if (!course) return null;
                const isCompleted = enr.status === 'COMPLETED' || enr.progressPercentage === 100;

                return (
                  <div key={enr.id} className="card card-hover" style={{
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid rgba(148,163,184,0.24)',
                    boxShadow: '0 18px 28px -24px rgba(15, 23, 42, 0.35)',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                  }}>
                    <div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                        <img
                          src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=200&q=80'}
                          alt={course.title}
                          style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {course.category}
                          </span>
                          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--navy-900)', marginTop: 2, marginBottom: 4, lineHeight: 1.3 }}>
                            {course.title}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            <Clock size={13} />
                            <span>{isCompleted ? 'Curriculum Finished' : `${enr.progressPercentage || 0}% completed`}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                          <span style={{ color: isCompleted ? 'var(--teal-600)' : 'var(--primary)', fontWeight: 700 }}>
                            {enr.progressPercentage || 0}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 8, backgroundColor: 'var(--slate-200)', borderRadius: 'var(--radius-full)' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, enr.progressPercentage || 0))}%`,
                              height: '100%',
                              backgroundColor: isCompleted ? 'var(--teal-600)' : 'var(--primary)',
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openCourse(course.id)}
                      className={`btn ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ width: '100%', padding: '10px' }}
                    >
                      <Play size={15} fill={isCompleted ? undefined : '#FFFFFF'} />
                      <span>{isCompleted ? 'Review Course' : 'Continue Lesson'}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Recommended Courses Section */}
        {recommended.length > 0 && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: 'var(--primary)', display: 'flex' }}><Sparkles size={18} /></div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '-0.02em' }}>
                  Recommended Courses
                </h2>
              </div>
              <button
                onClick={() => setCurrentPage('landing')}
                className="btn btn-ghost"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 700 }}
              >
                <span>Browse All</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
            }}>
              {recommended.map(course => (
                <div
                  key={course.id}
                  onClick={() => openCourse(course.id)}
                  className="card card-hover"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid rgba(148,163,184,0.24)',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                    boxShadow: '0 20px 30px -22px rgba(15, 23, 42, 0.38)',
                  }}
                >
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    style={{ width: '100%', height: 140, objectFit: 'cover' }}
                  />
                  <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>
                        {course.category}
                      </div>
                      <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--navy-900)', marginBottom: 8, lineHeight: 1.3 }}>
                        {course.title}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#D97706' }}>
                        <Star size={13} fill="#F59E0B" color="#F59E0B" />
                        <span>{course.rating.toFixed(1)}</span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({course.ratingCount})</span>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--teal-600)' }}>
                        {course.price === 0 ? 'Free' : `$${course.price}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
