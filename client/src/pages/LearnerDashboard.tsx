import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sidebar } from '../components/Sidebar';
import { IEnrollment, ICourse, ILiveSession, ICertificate } from '../types';
import { 
  BookOpen, 
  CheckCircle2, 
  Award, 
  Play, 
  Star, 
  ArrowRight, 
  Clock, 
  Video, 
  ShieldCheck, 
  Calendar,
  Lock,
  Compass,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui';

export const LearnerDashboard: React.FC = () => {
  const { currentUser, openCourse, setCurrentPage, openVerification, openLiveClass } = useApp();
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [liveSessions, setLiveSessions] = useState<ILiveSession[]>([]);
  const [certificates, setCertificates] = useState<ICertificate[]>([]);
  const [recommended, setRecommended] = useState<ICourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMyCourses().then(res => setEnrollments(res.enrollments || [])).catch(() => setEnrollments([])),
      api.getLiveSessions().then(res => setLiveSessions(res.sessions || [])).catch(() => setLiveSessions([])),
      api.getCertificates().then(res => setCertificates(res.certificates || [])).catch(() => setCertificates([])),
      api.getCourses().then(res => setRecommended((res.courses || []).slice(0, 3))).catch(() => setRecommended([])),
    ]).finally(() => setIsLoading(false));
  }, []);

  const enrolledCount = enrollments.length;
  const completedCount = enrollments.filter(e => e.status === 'COMPLETED' || (e.progressPercentage || 0) >= 100).length;
  const inProgressCount = enrolledCount - completedCount;

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Professional Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              <ShieldCheck size={14} />
              <span>Learner Workspace</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', margin: 0 }}>
              Welcome back, {currentUser?.fullName || 'Scholar'}
            </h1>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem', marginTop: 4, maxWidth: 640 }}>
              Track courseware progress, join scheduled live lectures, and review your cryptographically verified diplomas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCurrentPage('my-courses')}
              icon={<BookOpen size={15} />}
            >
              My Enrollments
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => openVerification('')}
              icon={<Award size={15} />}
            >
              Verify Certificate
            </Button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Enrolled Courses
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: 4, letterSpacing: '-0.02em' }}>
              {enrolledCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              Active in portfolio
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In Progress
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4, letterSpacing: '-0.02em' }}>
              {inProgressCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              Ongoing lessons
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Completed Curricula
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10B981', marginTop: 4, letterSpacing: '-0.02em' }}>
              {completedCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              Graduated programs
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Verified Credentials
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: 4, letterSpacing: '-0.02em' }}>
              {certificates.length || completedCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              SHA-256 stamped diplomas
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Workspace Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.6fr)',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Main Learning Track Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            
            {/* Continue Learning Section */}
            <section style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                    Continue Learning
                  </h2>
                  <p style={{ color: 'var(--slate-500)', fontSize: '0.82rem', marginTop: 2, margin: 0 }}>
                    Resume your current active courses and completed assignments.
                  </p>
                </div>
                {enrollments.length > 0 && (
                  <button
                    onClick={() => setCurrentPage('my-courses')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <span>View all enrollments</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>

              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      data-testid="enrollment-skeleton"
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        backgroundColor: '#FFFFFF',
                      }}
                      className="animate-pulse"
                    >
                      <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', backgroundColor: '#E2E8F0' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ width: '30%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                        <div style={{ width: '60%', height: 18, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                        <div style={{ width: '40%', height: 12, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : enrollments.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                }}>
                  <BookOpen size={36} color="var(--slate-400)" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 4 }}>
                    No active enrollments found
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--slate-500)', maxWidth: 400, margin: '0 auto 16px' }}>
                    Browse our multi-tier course catalog to register for primary, secondary, college, or university coursework.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setCurrentPage('landing')}
                    icon={<Compass size={15} />}
                  >
                    Browse Catalog
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {enrollments.map(enr => {
                    const course = enr.course;
                    if (!course) return null;
                    const isCompleted = enr.status === 'COMPLETED' || (enr.progressPercentage || 0) >= 100;
                    const pct = Math.min(100, Math.max(0, enr.progressPercentage || 0));

                    return (
                      <div 
                        key={enr.id}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          flexWrap: 'wrap',
                          backgroundColor: '#FFFFFF',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 240, flex: 1 }}>
                          {course.thumbnailUrl && (
                            <img
                              src={course.thumbnailUrl}
                              alt=""
                              style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-subtle)' }}
                            />
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {course.category}
                            </div>
                            <h3 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--navy-950)', margin: '2px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {course.title}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                              <Clock size={12} />
                              <span>{isCompleted ? 'Curriculum Completed' : `${pct}% completed`}</span>
                              <span>•</span>
                              {course.institutionName && <span>{course.institutionName}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Progress Meter & Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 200, justifyContent: 'flex-end' }}>
                          <div style={{ width: 100 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>
                              <span>Progress</span>
                              <span>{pct}%</span>
                            </div>
                            <div style={{ width: '100%', height: 6, backgroundColor: 'var(--slate-100)', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: isCompleted ? '#10B981' : 'var(--primary)' }} />
                            </div>
                          </div>

                          <Button
                            variant={isCompleted ? 'secondary' : 'primary'}
                            size="md"
                            onClick={() => openCourse(course.id)}
                            icon={<Play size={14} />}
                          >
                            {isCompleted ? 'Review' : 'Continue'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Upcoming Live Sessions & Lectures */}
            <section style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                    Live Synchronous Classrooms
                  </h2>
                  <p style={{ color: 'var(--slate-500)', fontSize: '0.82rem', marginTop: 2, margin: 0 }}>
                    Interactive WebRTC cloud lectures scheduled with your faculty.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setCurrentPage('live-classroom')}
                  icon={<Video size={14} />}
                >
                  Join Stage
                </Button>
              </div>

              {liveSessions.length === 0 ? (
                <div style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  fontSize: '0.86rem',
                  color: 'var(--slate-500)',
                }}>
                  No live sessions currently scheduled. You will be notified when your instructor begins a broadcast.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {liveSessions.map(sess => (
                    <div 
                      key={sess.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: sess.status === 'LIVE' ? 'rgba(239, 68, 68, 0.1)' : 'var(--slate-100)',
                          color: sess.status === 'LIVE' ? '#EF4444' : 'var(--navy-800)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Video size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--navy-950)' }}>
                            {sess.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <Calendar size={12} />
                            <span>{new Date(sess.scheduledStartTime).toLocaleString()}</span>
                            <span>•</span>
                            <span>Instructor: {sess.instructorName}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant={sess.status === 'LIVE' ? 'primary' : 'secondary'}
                        size="md"
                        onClick={() => openLiveClass(sess.id)}
                      >
                        {sess.status === 'LIVE' ? 'Join Live Now' : 'Room Details'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recommended Programs */}
            {recommended.length > 0 && (
              <section style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                      Recommended Curricula
                    </h2>
                    <p style={{ color: 'var(--slate-500)', fontSize: '0.82rem', marginTop: 2, margin: 0 }}>
                      Accredited coursework relevant to your learning path.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentPage('landing')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <span>Browse catalog</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                }}>
                  {recommended.map(course => (
                    <div 
                      key={course.id}
                      onClick={() => openCourse(course.id)}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--slate-400)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                    >
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title}
                        style={{ width: '100%', height: 110, objectFit: 'cover' }}
                      />
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                          {course.category}
                        </div>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', margin: '4px 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {course.title}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700, color: '#D97706' }}>
                            <Star size={12} fill="#F59E0B" color="#F59E0B" />
                            <span>{course.rating.toFixed(1)}</span>
                          </span>
                          <span style={{ fontWeight: 800, color: 'var(--navy-950)' }}>
                            {course.price === 0 ? 'Free' : `$${course.price}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Rail: Credentials & Compliance Dossier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Verifiable Credentials Dossier */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Award size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                  Earned Credentials
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', lineHeight: 1.5, marginBottom: 16 }}>
                Official diplomas granted upon passing proctored assessments, cryptographically verifiable via SHA-256 hash.
              </p>

              {certificates.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  color: 'var(--slate-500)',
                  border: '1px dashed var(--border-color)',
                }}>
                  Complete all modules and achieve a passing score in the final assessment to earn your official diploma.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {certificates.map(cert => (
                    <div 
                      key={cert.id}
                      style={{
                        backgroundColor: 'var(--slate-50)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--navy-950)' }}>
                          {cert.courseTitle}
                        </div>
                        <span style={{
                          backgroundColor: '#F0FDF4',
                          color: '#166534',
                          border: '1px solid #BBF7D0',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}>
                          Score: {cert.gradePercentage}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: 8 }}>
                        Code: <code>{cert.certificateNumber}</code>
                      </div>
                      <button
                        onClick={() => openVerification(cert.certificateNumber)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: 0,
                        }}
                      >
                        <ShieldCheck size={12} />
                        <span>Verify Public Credential →</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Academic Integrity & Proctoring Telemetry Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Lock size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                  Academic Integrity Standards
                </h3>
              </div>
              <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.82rem', color: 'var(--slate-600)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li>Assessments monitor window focus and tab switches to ensure independent examination integrity.</li>
                <li>Minimum syllabus passing benchmark is strictly enforced before credential generation.</li>
                <li>All diploma records are permanently recorded in the institution's immutable ledger.</li>
              </ul>
            </div>

            {/* Quick Verification Lookup */}
            <div style={{
              backgroundColor: 'var(--slate-900)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 6 }}>
                Diploma Verification Portal
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-400)', lineHeight: 1.5, marginBottom: 14 }}>
                Verify credentials issued to colleagues or students by entering the code.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => openVerification('')}
                style={{ width: '100%' }}
              >
                Open Verification Gateway
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
