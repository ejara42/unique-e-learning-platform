import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, Clock, FileText, MonitorPlay, PlayCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICourse, ILesson } from '../types';
import { Button } from '../components/ui';

export const LessonPlayerPage: React.FC = () => {
  const { selectedCourseId, selectedLessonId, setSelectedLessonId, setCurrentPage, startExam } = useApp();
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
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading lesson content...</p>
      </div>
    );
  }

  const isVideo = lesson.contentType === 'VIDEO';
  const isDocument = lesson.contentType === 'DOCUMENT';

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <button
          onClick={() => setCurrentPage('course-detail')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--slate-100)',
            color: 'var(--navy-950)',
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            padding: '8px 14px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={16} /> Back to course
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.5fr)', gap: 28 }}>
          <div>
            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {isVideo ? <MonitorPlay size={14} /> : isDocument ? <FileText size={14} /> : <ShieldCheck size={14} />}
                  {lesson.contentType}
                </span>
                {lesson.isFreePreview && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'var(--teal-50)',
                    color: 'var(--teal-700)',
                    border: '1px solid var(--teal-200)',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}>
                    <CheckCircle size={12} /> Free Preview
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 12 }}>
                {lesson.title}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {lesson.durationMinutes} min</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BookOpen size={14} /> {course.title}</span>
              </div>

              <div style={{
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                background: isVideo ? 'linear-gradient(135deg, #0F172A 0%, #172554 100%)' : '#FFFFFF',
                height: isVideo ? 360 : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: 'var(--shadow-md)',
              }}>
                {isVideo ? (
                  <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000000" }}>
                    <video
                      key={lesson.id}
                      controls
                      playsInline
                      poster={course.thumbnailUrl}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
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
                  <div style={{ width: '100%', padding: 24, color: 'var(--slate-700)', lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 12, color: 'var(--navy-950)' }}>Lesson notes</div>
                    <p>
                      This lesson introduces the core ideas behind {course.title.toLowerCase()}, explains the key concepts learners should master, and provides a practical walkthrough that builds toward applied skills and assessment readiness.
                    </p>
                    <p>
                      Use the learning objectives below to guide your progress and review the supporting material before attempting the module quiz or assessment.
                    </p>
                    <ul style={{ paddingLeft: 22, marginTop: 16 }}>
                      {course.learningOutcomes?.slice(0, 4).map((outcome, index) => (
                        <li key={index} style={{ marginBottom: 8 }}>{outcome}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Lesson progress
              </div>
              <div style={{
                width: '100%',
                height: 10,
                borderRadius: 999,
                backgroundColor: 'var(--slate-200)',
                overflow: 'hidden',
                marginBottom: 12,
              }}>
                <div style={{ width: `${Math.max(8, Math.min(100, progressPercent))}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--teal-500) 100%)' }} />
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{Math.round(progressPercent)}% complete</div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Lesson navigation
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <Button
                  variant="secondary"
                  onClick={() => handleNavigateLesson(previousLesson)}
                  disabled={!previousLesson}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleNavigateLesson(nextLesson)}
                  disabled={!nextLesson}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Next
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lessons.map((item, idx) => {
                  const active = item.id === lesson.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateLesson(item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: '1px solid',
                        borderColor: active ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: active ? 'var(--primary-light)' : '#FFFFFF',
                        color: active ? 'var(--primary)' : 'var(--navy-950)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontWeight: active ? 800 : 600,
                        cursor: 'pointer',
                      }}
                    >
                      {idx + 1}. {item.title}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 16 }}>
                {lesson.contentType === 'QUIZ' ? (
                  <Button
                    variant="primary"
                    onClick={() => startExam('assessment-1')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Take quiz now
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage('course-detail')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Continue learning
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
