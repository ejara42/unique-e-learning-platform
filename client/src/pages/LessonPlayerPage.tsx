import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, Clock, FileText, MonitorPlay, PlayCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICourse, ILesson } from '../types';
import { Button } from '../components/ui';

export const LessonPlayerPage: React.FC = () => {
  const { selectedCourseId, selectedLessonId, setSelectedLessonId, setCurrentPage, startExam, currentUser } = useApp();
  const [course, setCourse] = useState<ICourse | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedCourseId) return;

    api.getCourse(selectedCourseId)
      .then(res => setCourse(res.course))
      .catch(() => setCourse(null));
  }, [selectedCourseId]);

  const lessons: ILesson[] = useMemo(() => {
    if (!course) return [];
    return (course.modules || []).flatMap(module => module.lessons || []);
  }, [course]);

  const lesson = useMemo<ILesson | null>(() => {
    if (!course || !selectedLessonId) {
      return lessons[0] ?? null;
    }

    for (const module of course.modules || []) {
      const found = module.lessons?.find(item => item.id === selectedLessonId);
      if (found) return found;
    }

    return lessons[0] ?? null;
  }, [course, selectedLessonId, lessons]);

  useEffect(() => {
    if (!selectedCourseId || !lesson) return;
    if (completedLessons[lesson.id]) return;

    api.updateProgress(selectedCourseId, lesson.id)
      .then(() => setCompletedLessons(prev => ({ ...prev, [lesson.id]: true })))
      .catch(() => {
        setCompletedLessons(prev => ({ ...prev, [lesson.id]: true }));
      });
  }, [selectedCourseId, lesson, completedLessons]);

  const lessonIndex = Math.max(0, lessons.findIndex(item => item.id === lesson?.id));
  const completedCount = lessons.filter(item => completedLessons[item.id]).length;
  const progressPercent = lessons.length ? (completedCount / lessons.length) * 100 : 0;
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  const handleNavigateLesson = (target: ILesson | null) => {
    if (!target) return;
    setSelectedLessonId(target.id);
  };

  if (!course || !lesson) {
    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 40,
      }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <p style={{ color: 'var(--slate-500)', fontSize: '0.92rem' }}>Loading lesson content...</p>
      </div>
    );
  }

  const isVideo = lesson.contentType === 'VIDEO';
  const isDocument = lesson.contentType === 'DOCUMENT';

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', padding: '28px 24px 64px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <button
          onClick={() => setCurrentPage('course-detail')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#FFFFFF',
            color: 'var(--navy-900)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            fontWeight: 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={14} /> Back to Course Syllabus
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(300px, 0.5fr)', gap: 24, alignItems: 'start' }}>
          {/* Main Lesson Stage */}
          <div>
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-xs)',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: 'var(--slate-100)',
                  color: 'var(--navy-900)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {isVideo ? <MonitorPlay size={13} /> : isDocument ? <FileText size={13} /> : <ShieldCheck size={13} />}
                  {lesson.contentType}
                </span>
                {lesson.isFreePreview && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: '#F0FDF4',
                    color: '#166534',
                    border: '1px solid #BBF7D0',
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}>
                    <CheckCircle size={11} /> Free Preview
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                {lesson.title}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', color: 'var(--slate-500)', fontSize: '0.82rem', marginBottom: 20 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> {lesson.durationMinutes} min</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><BookOpen size={13} /> {course.title}</span>
              </div>

              {/* Video Player / Document Reading Stage */}
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                backgroundColor: isVideo ? '#000000' : 'var(--slate-50)',
                minHeight: isVideo ? 360 : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                {isVideo ? (
                  <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <video
                      key={lesson.id}
                      controls
                      playsInline
                      poster={course.thumbnailUrl}
                      style={{ width: "100%", maxHeight: 460, objectFit: "contain" }}
                      onEnded={() => {
                        if (selectedCourseId) {
                          api.updateProgress(selectedCourseId, lesson.id);
                          setCompletedLessons(prev => ({ ...prev, [lesson.id]: true }));
                        }
                      }}
                    >
                      <source
                        src={(lesson as any).videoUrl || (lesson as any).hlsUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                        type="video/mp4"
                      />
                      Your browser does not support HTML5 video playback.
                    </video>
                  </div>
                ) : (
                  <div style={{ width: '100%', padding: '24px', color: 'var(--slate-700)', lineHeight: 1.7, fontSize: '0.92rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 8, color: 'var(--navy-950)' }}>
                      Module Reference Notes
                    </div>
                    <p style={{ margin: '0 0 12px' }}>
                      This lesson introduces core theoretical and applied concepts for {course.title.toLowerCase()}. Review all foundational topics, practice exercises, and syllabus requirements prior to taking the proctored assessment.
                    </p>
                    <ul style={{ paddingLeft: 20, margin: '12px 0 0' }}>
                      {course.learningOutcomes?.slice(0, 4).map((outcome, index) => (
                        <li key={index} style={{ marginBottom: 6 }}>{outcome}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Navigation & Progress */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Progress Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                <span>Curriculum Progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div style={{
                width: '100%',
                height: 8,
                borderRadius: 999,
                backgroundColor: 'var(--slate-100)',
                overflow: 'hidden',
                marginBottom: 8,
              }}>
                <div style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                {completedCount} of {lessons.length} lessons completed
              </div>
            </div>

            {/* Lesson Navigation List */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                Course Outline
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleNavigateLesson(previousLesson)}
                  disabled={!previousLesson}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleNavigateLesson(nextLesson)}
                  disabled={!nextLesson}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Next
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
                {lessons.map((item, idx) => {
                  const active = item.id === lesson.id;
                  const isDone = Boolean(completedLessons[item.id]);

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateLesson(item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: '1px solid',
                        borderColor: active ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: active ? 'var(--slate-100)' : '#FFFFFF',
                        color: active ? 'var(--primary)' : 'var(--navy-950)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        fontSize: '0.84rem',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {idx + 1}. {item.title}
                      </span>
                      {isDone && <CheckCircle size={14} color="#10B981" style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                {lesson.contentType === 'QUIZ' ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (!currentUser) {
                        setCurrentPage('login');
                      } else {
                        startExam('assessment-1');
                      }
                    }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Take Proctored Quiz
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setCurrentPage('course-detail')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    View Full Syllabus
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
