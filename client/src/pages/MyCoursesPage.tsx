import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sidebar } from '../components/Sidebar';
import { IEnrollment } from '../types';
import { EmptyState, Button, LoadingState, ErrorState } from '../components/ui';
import { BookOpen, CheckCircle, Play, Award, Compass, Search } from 'lucide-react';

export const MyCoursesPage: React.FC = () => {
  const { openCourse, openVerification, setCurrentPage } = useApp();
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEnrollments = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await api.getMyCourses();
      setEnrollments(response.enrollments || []);
    } catch (error: any) {
      setEnrollments([]);
      setLoadError(error?.message || 'Unable to load your course enrollments right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, []);

  const completedList = enrollments.filter(e => e.status === 'COMPLETED' || e.progressPercentage === 100);
  const inProgressList = enrollments.filter(e => e.status !== 'COMPLETED' && (e.progressPercentage || 0) < 100);

  const baseList = 
    activeTab === 'completed' ? completedList :
    activeTab === 'in-progress' ? inProgressList :
    enrollments;

  const filteredList = searchQuery.trim() 
    ? baseList.filter(e => e.course?.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : baseList;

  return (
    <div className="dashboard-layout" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />

      <main className="dashboard-main">
        {/* Page Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', margin: 0 }}>
              My Enrollments & Learning Path
            </h1>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem', marginTop: 4, margin: 0 }}>
              Track courseware progress, resume active lessons, and view earned verifiable certificates.
            </p>
          </div>

          <Button 
            variant="secondary"
            size="md"
            onClick={() => setCurrentPage('landing')}
            icon={<Compass size={15} />}
          >
            Explore Catalog
          </Button>
        </div>

        {/* Tab & Search Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 16,
          marginBottom: 24,
        }}>
          {/* Segmented Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: activeTab === 'all' ? 'var(--primary)' : 'var(--border-color)',
                backgroundColor: activeTab === 'all' ? 'var(--primary)' : '#FFFFFF',
                color: activeTab === 'all' ? '#FFFFFF' : 'var(--navy-900)',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'all' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              All Enrolled ({enrollments.length})
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: activeTab === 'in-progress' ? 'var(--primary)' : 'var(--border-color)',
                backgroundColor: activeTab === 'in-progress' ? 'var(--primary)' : '#FFFFFF',
                color: activeTab === 'in-progress' ? '#FFFFFF' : 'var(--navy-900)',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'in-progress' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              In Progress ({inProgressList.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: activeTab === 'completed' ? 'var(--primary)' : 'var(--border-color)',
                backgroundColor: activeTab === 'completed' ? 'var(--primary)' : '#FFFFFF',
                color: activeTab === 'completed' ? '#FFFFFF' : 'var(--navy-900)',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'completed' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              Completed ({completedList.length})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
            <Search size={15} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by course title..."
              className="input-field"
              style={{ paddingLeft: 36, height: 38, fontSize: '0.84rem' }}
            />
          </div>
        </div>

        {/* Course Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLoading ? (
            <LoadingState message="Loading your learning path…" rows={2} />
          ) : loadError ? (
            <ErrorState
              title="Unable to load your courses"
              message={loadError}
              onRetry={loadEnrollments}
              retryLabel="Refresh courses"
            />
          ) : filteredList.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={32} color="var(--primary)" />}
              title={searchQuery ? 'No matching courses found' : 'No courses in this view'}
              description={searchQuery
                ? `No enrolled courses match "${searchQuery}". Try a different keyword.`
                : 'Browse our catalog to enroll in foundational or accredited courses.'}
              actionText="Browse Course Catalog"
              onAction={() => setCurrentPage('landing')}
              actionIcon={<Compass size={15} />}
            />
          ) : (
            filteredList.map(enr => {
              const course = enr.course;
              if (!course) return null;
              const isCompleted = enr.status === 'COMPLETED' || enr.progressPercentage === 100;
              const pct = Math.min(100, Math.max(0, enr.progressPercentage || 0));

              return (
                <div 
                  key={enr.id} 
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 18,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  {/* Course Thumbnail */}
                  <img 
                    src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=200&q=80'} 
                    alt={course.title}
                    style={{ 
                      width: 110, 
                      height: 72, 
                      borderRadius: 'var(--radius-md)', 
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: '1px solid var(--border-subtle)',
                    }}
                  />

                  {/* Course Details & Progress */}
                  <div style={{ flex: '1 1 300px', minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {course.category}
                      </span>
                      {isCompleted && (
                        <span style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700 }}>
                          Completed
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy-950)', margin: '0 0 8px', lineHeight: 1.35 }}>
                      {course.title}
                    </h3>

                    <div style={{ maxWidth: 380 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: 6, backgroundColor: 'var(--slate-100)', borderRadius: 999, overflow: 'hidden' }}>
                        <div 
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: isCompleted ? '#10B981' : 'var(--primary)',
                            borderRadius: 999,
                            transition: 'width 0.4s ease',
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 8, 
                    marginLeft: 'auto',
                  }}>
                    {isCompleted ? (
                      <>
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => openVerification(enr.certificateId || '')}
                          icon={<Award size={14} />}
                        >
                          Certificate
                        </Button>
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => openCourse(course.id)}
                        >
                          Review Syllabus
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="primary"
                        size="md"
                        onClick={() => openCourse(course.id)}
                        icon={<Play size={14} />}
                      >
                        Continue Course
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
