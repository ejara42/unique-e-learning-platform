import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sidebar } from '../components/Sidebar';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Video, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Settings,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { Button, Badge, ToastViewport, useToast } from '../components/ui';

export const TeacherCourseStudio: React.FC = () => {
  const { setCurrentPage, openCourse } = useApp();
  const { toast, showToast, dismissToast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'>('Beginner');
  const [price, setPrice] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Step 2: Content Modules
  const [modules, setModules] = useState<Array<{
    title: string;
    lessons: Array<{
      title: string;
      type: 'VIDEO' | 'DOCUMENT' | 'QUIZ';
      duration: number;
      videoUrl?: string;
      uploading?: boolean;
    }>;
  }>>([
    {
      title: 'Module 1: Introduction & Overview',
      lessons: [
        { title: 'Welcome and Course Roadmap', type: 'VIDEO', duration: 15 },
      ],
    },
  ]);

  // Step 3: Assessment & Passing Criteria
  const [passingGrade, setPassingGrade] = useState(75);
  const [antiCheatingEnabled, setAntiCheatingEnabled] = useState(true);
  const [hlsTranscoding, setHlsTranscoding] = useState(true);

  // Success Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddModule = () => {
    setModules([
      ...modules,
      {
        title: `Module ${modules.length + 1}: Core Concepts`,
        lessons: [{ title: 'Hands-on Lab Exercise', type: 'VIDEO', duration: 20 }],
      },
    ]);
  };

  const handleRemoveModule = (moduleIndex: number) => {
    if (modules.length <= 1) return;
    setModules(modules.filter((_, idx) => idx !== moduleIndex));
  };

  const handleAddLesson = (moduleIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].lessons.push({
      title: `New Lesson ${updated[moduleIndex].lessons.length + 1}`,
      type: 'VIDEO',
      duration: 15,
    });
    setModules(updated);
  };

  const handleRemoveLesson = (moduleIndex: number, lessonIndex: number) => {
    const updated = [...modules];
    if (updated[moduleIndex].lessons.length <= 1) return;
    updated[moduleIndex].lessons = updated[moduleIndex].lessons.filter((_, idx) => idx !== lessonIndex);
    setModules(updated);
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      showToast({ title: 'Course title missing', description: 'Add a course title in Step 1 before publishing.', tone: 'error' });
      setCurrentStep(1);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formattedModules = modules.map((m, mIdx) => ({
        id: `mod-${mIdx + 1}`,
        title: m.title,
        order: mIdx + 1,
        lessons: m.lessons.map((l, lIdx) => ({
          id: `les-${mIdx + 1}-${lIdx + 1}`,
          title: l.title,
          order: lIdx + 1,
          contentType: l.type,
          durationMinutes: l.duration,
          videoUrl: l.videoUrl || undefined,
          isFreePreview: lIdx === 0,
        })),
      }));

      const res = await api.createCourse({
        title,
        description,
        category,
        level,
        price,
        thumbnailUrl: thumbnailUrl || undefined,
        modules: formattedModules as any,
        completionCriteria: { minimumPassingGradePct: passingGrade },
        isPublished: true,
      });

      setSuccessMsg(`Course "${title}" successfully published to EduSphere!`);
      showToast({ title: 'Course published', description: 'Your curriculum is now live in the marketplace.', tone: 'success' });
      setTimeout(() => {
        openCourse(res.course.id);
      }, 1500);
    } catch (err: any) {
      showToast({ title: 'Publish failed', description: err.message || 'Failed to publish course', tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, label: 'Basic Info' },
    { number: 2, label: 'Curriculum' },
    { number: 3, label: 'Settings' },
    { number: 4, label: 'Publish' },
  ];

  return (
    <div className="dashboard-layout" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <ToastViewport toast={toast} onDismiss={dismissToast} />

      <main className="dashboard-main">
        {/* Header Section */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: '0.78rem',
              fontWeight: 800,
            }}>
              Curriculum Authoring
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em' }}>
            Course Studio
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
            Design, assemble, and publish accredited curriculum with automated grading and verifiable credentials.
          </p>
        </div>

        {/* 4-Stage Stepper Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '20px 32px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          boxShadow: 'var(--shadow-xs)',
          overflowX: 'auto',
          gap: 16,
        }}>
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;
            return (
              <React.Fragment key={s.number}>
                <div 
                  onClick={() => setCurrentStep(s.number as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    userSelect: 'none',
                    opacity: isCurrent || isCompleted ? 1 : 0.55,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? 'var(--teal-600)' : isCurrent ? 'var(--primary)' : 'var(--slate-200)',
                    color: isCompleted || isCurrent ? '#FFFFFF' : 'var(--slate-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    boxShadow: isCurrent ? '0 0 0 4px var(--primary-light)' : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                    {isCompleted ? <Check size={18} /> : s.number}
                  </div>
                  <span style={{
                    fontWeight: isCurrent ? 800 : 600,
                    fontSize: '0.94rem',
                    color: isCurrent ? 'var(--navy-950)' : 'var(--slate-600)',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: currentStep > s.number ? 'var(--teal-600)' : 'var(--slate-200)',
                    minWidth: 30,
                    transition: 'background-color 0.2s ease',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div style={{
            backgroundColor: 'var(--teal-50)',
            color: 'var(--teal-900)',
            border: '1px solid var(--teal-200)',
            padding: 18,
            borderRadius: 'var(--radius-lg)',
            marginBottom: 24,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <CheckCircle2 size={22} color="var(--teal-600)" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Basic Info Form */}
        {currentStep === 1 && (
          <div className="card" style={{ maxWidth: 840, padding: 32 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 20 }}>
              Course Information & Details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Course Title *
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems & Cloud Computing Architectures"
                  className="input-field"
                  style={{ height: 44, fontSize: '0.95rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Course Description & Syllabus *
                </label>
                <textarea 
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Outline what scholars will learn, core prerequisites, and expected outcomes..."
                  className="input-field"
                  style={{ resize: 'vertical', fontSize: '0.92rem', minHeight: 110 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Academic Category
                  </label>
                  <select 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="input-field"
                    style={{ height: 44 }}
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Languages">Languages</option>
                    <option value="Business & Management">Business & Management</option>
                    <option value="Engineering">Engineering</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Difficulty Level
                  </label>
                  <select 
                    value={level}
                    onChange={e => setLevel(e.target.value as any)}
                    className="input-field"
                    style={{ height: 44 }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Tuition Price ($ USD)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 14 }} />
                    <input 
                      type="number"
                      min={0}
                      value={price}
                      onChange={e => setPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0 for Free"
                      className="input-field"
                      style={{ paddingLeft: 36, height: 44 }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Course Cover Thumbnail
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: uploadingThumbnail ? 'not-allowed' : 'pointer',
                    padding: '9px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: thumbnailUrl ? '#F0FDF4' : '#F8FAFC',
                    color: thumbnailUrl ? '#166534' : 'var(--navy-900)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                  }}>
                    <UploadCloud size={16} />
                    <span>{uploadingThumbnail ? 'Uploading image...' : thumbnailUrl ? 'Thumbnail Uploaded ✓' : 'Upload Cover Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingThumbnail}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingThumbnail(true);
                        try {
                          const res = await api.uploadFile(file, 'IMAGE', true);
                          setThumbnailUrl(res.fileUrl);
                          showToast({ title: 'Thumbnail uploaded', description: file.name, tone: 'success' });
                        } catch (err: any) {
                          showToast({ title: 'Thumbnail upload failed', description: err.message, tone: 'error' });
                        } finally {
                          setUploadingThumbnail(false);
                        }
                      }}
                    />
                  </label>
                  {thumbnailUrl && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                      {thumbnailUrl}
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 16,
                paddingTop: 20,
                borderTop: '1px solid var(--border-color)',
              }}>
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => setCurrentPage('learner-dashboard')}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="primary"
                  onClick={() => {
                    if (!title.trim()) {
                      showToast({ title: 'Course title missing', description: 'Please provide a course title to continue.', tone: 'warning' });
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  icon={<ArrowRight size={16} />}
                >
                  Next: Curriculum Structure
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Content Modules */}
        {currentStep === 2 && (
          <div className="card" style={{ maxWidth: 840, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                  Curriculum Structure
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 2 }}>
                  Organize your course into structured modules and individual learning activities.
                </p>
              </div>

              <Button 
                variant="secondary"
                size="sm"
                onClick={handleAddModule}
                icon={<Plus size={16} />}
              >
                Add Module
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
              {modules.map((mod, mIdx) => (
                <div key={mIdx} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  backgroundColor: 'var(--slate-50)',
                }}>
                  {/* Module Title Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: 'var(--primary)',
                        backgroundColor: 'var(--primary-light)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                      }}>
                        M{mIdx + 1}
                      </span>
                      <input 
                        type="text" 
                        value={mod.title}
                        onChange={e => {
                          const updated = [...modules];
                          updated[mIdx].title = e.target.value;
                          setModules(updated);
                        }}
                        className="input-field"
                        style={{ fontWeight: 700, backgroundColor: '#FFFFFF', height: 40 }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Button 
                        size="sm"
                        variant="primary"
                        onClick={() => handleAddLesson(mIdx)}
                        icon={<Plus size={14} />}
                      >
                        Add Lesson
                      </Button>
                      {modules.length > 1 && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveModule(mIdx)}
                          title="Delete module"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Lessons list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mod.lessons.map((lesson, lIdx) => (
                      <div key={lIdx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                        boxShadow: 'var(--shadow-xs)',
                      }}>
                        <Video size={16} color="var(--primary)" />
                        <input 
                          type="text" 
                          value={lesson.title}
                          onChange={e => {
                            const updated = [...modules];
                            updated[mIdx].lessons[lIdx].title = e.target.value;
                            setModules(updated);
                          }}
                          className="input-field"
                          style={{ padding: '6px 12px', fontSize: '0.9rem', flex: 1, height: 36 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min={1}
                            value={lesson.duration}
                            onChange={e => {
                              const updated = [...modules];
                              updated[mIdx].lessons[lIdx].duration = parseInt(e.target.value, 10) || 15;
                              setModules(updated);
                            }}
                            className="input-field"
                            style={{ width: 64, height: 36, padding: '4px 8px', fontSize: '0.85rem' }}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min</span>
                        </div>

                        {/* Video / Resource Upload Button */}
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: lesson.uploading ? 'not-allowed' : 'pointer',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: lesson.videoUrl ? '#F0FDF4' : '#F8FAFC',
                          color: lesson.videoUrl ? '#166534' : 'var(--navy-900)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}>
                          <UploadCloud size={14} />
                          <span>{lesson.uploading ? 'Uploading...' : lesson.videoUrl ? 'Video ✓' : 'Upload Video'}</span>
                          <input
                            type="file"
                            accept="video/*,application/pdf"
                            style={{ display: 'none' }}
                            disabled={lesson.uploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const updated = [...modules];
                              updated[mIdx].lessons[lIdx].uploading = true;
                              setModules([...updated]);
                              try {
                                const uploadRes = await api.uploadFile(file, 'VIDEO_SOURCE', true);
                                const next = [...modules];
                                next[mIdx].lessons[lIdx].videoUrl = uploadRes.fileUrl;
                                next[mIdx].lessons[lIdx].uploading = false;
                                setModules(next);
                                showToast({ title: 'Video uploaded', description: `Uploaded "${file.name}" to cloud storage.`, tone: 'success' });
                              } catch (err: any) {
                                const next = [...modules];
                                next[mIdx].lessons[lIdx].uploading = false;
                                setModules(next);
                                showToast({ title: 'Upload failed', description: err.message || 'Upload failed', tone: 'error' });
                              }
                            }}
                          />
                        </label>
                        {mod.lessons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLesson(mIdx, lIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--slate-400)',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                            title="Remove lesson"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 20,
              borderTop: '1px solid var(--border-color)',
            }}>
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => setCurrentStep(1)}
                icon={<ArrowLeft size={16} />}
              >
                Back: Basic Info
              </Button>
              <Button 
                type="button" 
                variant="primary"
                onClick={() => setCurrentStep(3)}
                icon={<ArrowRight size={16} />}
              >
                Next: Settings & Grading
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <div className="card" style={{ maxWidth: 840, padding: 32 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8 }}>
              Grading & Enterprise Settings
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
              Configure passing score criteria, automated anti-cheating proctoring, and media encoding.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Minimum Passing Grade (%) for Official Credential
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="number" 
                    value={passingGrade}
                    onChange={e => setPassingGrade(parseInt(e.target.value, 10))}
                    min={50}
                    max={100}
                    className="input-field"
                    style={{ maxWidth: 160, height: 44, fontSize: '1rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Scholars scoring at or above this threshold automatically receive a cryptographically signed diploma.
                  </span>
                </div>
              </div>

              {/* Anti-Cheating Switch Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} color="var(--teal-600)" />
                    <span>Real-Time Anti-Cheating Telemetry</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Detects browser tab switching, blocks unauthorized copy/paste, and records tamper-proof audit trails.
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={antiCheatingEnabled} 
                  onChange={e => setAntiCheatingEnabled(e.target.checked)}
                  style={{ width: 22, height: 22, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>

              {/* Adaptive HLS Transcoding */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="var(--primary)" />
                    <span>Adaptive HLS Multi-Bitrate Transcoding</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Encodes uploaded videos into 360p, 720p, and 1080p streams for seamless playback on constrained connections.
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={hlsTranscoding} 
                  onChange={e => setHlsTranscoding(e.target.checked)}
                  style={{ width: 22, height: 22, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 20,
              borderTop: '1px solid var(--border-color)',
            }}>
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => setCurrentStep(2)}
                icon={<ArrowLeft size={16} />}
              >
                Back: Curriculum
              </Button>
              <Button 
                type="button" 
                variant="primary"
                onClick={() => setCurrentStep(4)}
                icon={<ArrowRight size={16} />}
              >
                Next: Review & Publish
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Publish */}
        {currentStep === 4 && (
          <div className="card" style={{ maxWidth: 840, padding: 32 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8 }}>
              Ready to Publish to EduSphere
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.92rem' }}>
              Confirm your curriculum settings. Once published, this course will be immediately discoverable in the catalog.
            </p>

            <div style={{
              backgroundColor: 'var(--slate-50)',
              padding: 24,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              marginBottom: 28,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Badge variant="primary">{category}</Badge>
                <Badge variant="neutral">{level}</Badge>
                <Badge variant="teal">{price === 0 ? 'Free Tuition' : `$${price} USD`}</Badge>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--navy-950)', marginBottom: 6 }}>
                {title || 'Untitled Course'}
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--slate-700)', marginBottom: 16, lineHeight: 1.5 }}>
                {description || 'No description provided.'}
              </p>

              <div style={{
                display: 'flex',
                gap: 20,
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: 12,
                flexWrap: 'wrap',
              }}>
                <span><strong>{modules.length}</strong> Modules</span>
                <span>•</span>
                <span><strong>{modules.reduce((acc, m) => acc + m.lessons.length, 0)}</strong> Lessons</span>
                <span>•</span>
                <span>Passing Grade: <strong>{passingGrade}%</strong></span>
                <span>•</span>
                <span>Anti-Cheating: <strong>{antiCheatingEnabled ? 'Active' : 'Disabled'}</strong></span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 20,
              borderTop: '1px solid var(--border-color)',
            }}>
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => setCurrentStep(3)}
                icon={<ArrowLeft size={16} />}
              >
                Back: Settings
              </Button>
              <Button 
                type="button" 
                variant="teal"
                size="lg"
                onClick={handlePublish} 
                isLoading={isSubmitting}
                style={{ padding: '12px 32px' }}
              >
                {isSubmitting ? 'Publishing Course...' : 'Publish Course'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
