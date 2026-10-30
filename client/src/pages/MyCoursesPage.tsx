import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sidebar } from '../components/Sidebar';
import { IEnrollment } from '../types';
import { EmptyState, Badge, Button } from '../components/ui';
import { BookOpen, CheckCircle, Clock, Play, Award, Compass, Search } from 'lucide-react';

export const MyCoursesPage: React.FC = () => {
  const { openCourse, openVerification, setCurrentPage } = useApp();
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getMyCourses().then(res => setEnrollments(res.enrollments || [])).catch(() => setEnrollments([]));
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
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        {/* Page Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '-0.025em' }}>
              My Courses
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              Manage your active enrollments, track module progress, and download verified certificates.
            </p>
          </div>

          <Button 
            variant="secondary"
            onClick={() => setCurrentPage('landing')}
            leftIcon={<Compass size={16} />}
          >
            Explore More Courses
          </Button>
        </div>

        {/* Tab & Search Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 16,
          marginBottom: 28,
        }}>
          {/* Segmented Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              All Enrolled ({enrollments.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`btn btn-sm ${activeTab === 'completed' ? 'btn-teal' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              Completed ({completedList.length})
            </button>
            <button
              onClick={() => setActiveTab('in-progress')}
              className={`btn btn-sm ${activeTab === 'in-progress' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              In-Progress ({inProgressList.length})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
            <Search size={16} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 13 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by course title..."
              className="input-field"
              style={{ paddingLeft: 38, height: 40, fontSize: 'var(--text-xs)' }}
            />
          </div>
        </div>

        {/* Course Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredList.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={36} />}
              title={searchQuery ? 'No matching courses found' : 'No courses in this view'}
              description={searchQuery 
                ? `No enrolled courses match "${searchQuery}". Try a different keyword.` 
                : 'Browse our catalog to enroll in courses and begin learning.'}
              actionText="Explore Course Catalog"
              onAction={() => setCurrentPage('landing')}
              actionIcon={<Compass size={16} />}
            />
          ) : (
            filteredList.map(enr => {
              const course = enr.course;
              if (!course) return null;
              const isCompleted = enr.status === 'COMPLETED' || enr.progressPercentage === 100;

              return (
                <div 
                  key={enr.id} 
                  className="card card-hover"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 20,
                    padding: 20,
                  }}
                >
                  {/* Course Thumbnail */}
                  <img 
                    src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=200&q=80'} 
                    alt={course.title}
                    style={{ 
                      width: 140, 
                      height: 90, 
                      borderRadius: 'var(--radius-lg)', 
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />

                  {/* Course Details & Progress */}
                  <div style={{ flex: '1 1 320px', minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {course.category}
                      </span>
                      {isCompleted && (
                        <Badge variant="teal" icon={<CheckCircle size={12} />}>
                          Completed
                        </Badge>
                      )}
                    </div>

                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 8, lineHeight: 1.3 }}>
                      {course.title}
                    </h3>

                    <div style={{ maxWidth: 440 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Completion</span>
                        <span style={{ color: isCompleted ? 'var(--teal-600)' : 'var(--primary)', fontWeight: 700 }}>
                          {enr.progressPercentage || 0}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, backgroundColor: 'var(--slate-200)', borderRadius: 'var(--radius-full)' }}>
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

                  {/* Actions Area */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 8, 
                    alignItems: 'stretch',
                    minWidth: 160,
                    marginLeft: 'auto',
                  }}>
                    {isCompleted ? (
                      <>
                        <Button 
                          variant="teal"
                          onClick={() => openVerification(enr.certificateId || '')}
                          leftIcon={<Award size={15} />}
                          size="sm"
                        >
                          Certificate
                        </Button>
                        <Button 
                          variant="secondary"
                          onClick={() => openCourse(course.id)}
                          size="sm"
                        >
                          Review Lessons
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="primary"
                        onClick={() => openCourse(course.id)}
                        leftIcon={<Play size={15} fill="#FFFFFF" />}
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
