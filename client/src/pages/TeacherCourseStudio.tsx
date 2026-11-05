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
  UploadCloud,
  CheckCircle2,
  DollarSign,
  Layers,
  Sparkles,
  HelpCircle
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
  const [level, setLevel] = useState<string>('University Undergraduate');
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
      title: 'Module 1: Foundations & Architecture',
      lessons: [
        { title: 'Lecture 1: Core Principles and Objectives', type: 'VIDEO', duration: 20 },
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
        title: `Module ${modules.length + 1}: Advanced Concepts`,
        lessons: [{ title: 'Hands-on Laboratory Exercise', type: 'VIDEO', duration: 25 }],
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
      title: `Lesson ${updated[moduleIndex].lessons.length + 1}: Topic Discussion`,
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
      showToast({ title: 'Course published', description: 'Your curriculum is now live in the academic catalog.', tone: 'success' });
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
    { number: 1, label: 'Course Metadata' },
    { number: 2, label: 'Curriculum & Modules' },
    { number: 3, label: 'Grading & Integrity' },
    { number: 4, label: 'Review & Publish' },
  ];

  return (
    <div className="dashboard-layout" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <ToastViewport toast={toast} onDismiss={dismissToast} />

      <main className="dashboard-main">
        {/* Header Section */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              backgroundColor: 'var(--slate-100)',
              color: 'var(--navy-900)',
              border: '1px solid var(--border-color)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}>
              Curriculum Authoring Studio
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', margin: 0 }}>
            Course Creator
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', marginTop: 4 }}>
            Design accredited multi-tier courses, upload media lessons, and set proctored examination benchmarks.
          </p>
        </div>

        {/* 4-Stage Stepper Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
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
                    gap: 10,
                    cursor: 'pointer',
                    userSelect: 'none',
                    opacity: isCurrent || isCompleted ? 1 : 0.6,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isCompleted ? '#10B981' : isCurrent ? 'var(--primary)' : 'var(--slate-100)',
                    color: isCompleted || isCurrent ? '#FFFFFF' : 'var(--slate-600)',
                    border: `1px solid ${isCompleted ? '#10B981' : isCurrent ? 'var(--primary)' : 'var(--border-color)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                  }}>
                    {isCompleted ? <Check size={14} /> : s.number}
                  </div>
                  <span style={{
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: '0.88rem',
                    color: isCurrent ? 'var(--navy-950)' : 'var(--slate-600)',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: currentStep > s.number ? '#10B981' : 'var(--border-color)',
                    minWidth: 24,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div style={{
            backgroundColor: '#F0FDF4',
            color: '#166534',
            border: '1px solid #BBF7D0',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.9rem',
          }}>
            <CheckCircle2 size={20} color="#166534" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Basic Info Form */}
        {currentStep === 1 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-xs)',
            maxWidth: 820,
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
              1. Course Information & Scope
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', marginBottom: 24 }}>
              Provide clear academic identifiers, accreditation tiers, and enrollment pricing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Course Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Advanced Operating Systems and Kernel Internals"
                  className="input-field"
                  style={{ height: 42, fontSize: '0.92rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Course Syllabus & Learning Objectives *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Outline syllabus prerequisites, core topics covered, and target learning outcomes..."
                  className="input-field"
                  style={{ resize: 'vertical', fontSize: '0.9rem', minHeight: 100 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Academic Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="input-field"
                    style={{ height: 42, fontSize: '0.88rem' }}
                  >
                    <option value="Primary Education (Grades 1-8)">Primary Education (Grades 1-8)</option>
                    <option value="Secondary High School (Grades 9-12)">Secondary High School (Grades 9-12)</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Mathematics & Natural Sciences">Mathematics & Natural Sciences</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Languages">Languages</option>
                    <option value="Business & Management">Business & Management</option>
                    <option value="TVET & Vocational Trades">TVET & Vocational Trades</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Health & Medical Sciences">Health & Medical Sciences</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Education Level / Tier
                  </label>
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value as any)}
                    className="input-field"
                    style={{ height: 42, fontSize: '0.88rem' }}
                  >
                    <option value="Primary / Elementary">Primary / Elementary (Grades 1-8)</option>
                    <option value="High School / Secondary">High School / Secondary (Grades 9-12)</option>
                    <option value="College / TVET">College / TVET Diploma</option>
                    <option value="University Undergraduate">University Undergraduate Degree</option>
                    <option value="Postgraduate / Advanced">Postgraduate / Advanced</option>
                    <option value="Professional Certification">Professional Certification</option>
                    <option value="All Levels">All Levels / Foundational</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Tuition Price ($ USD)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={15} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 13 }} />
                    <input
                      type="number"
                      min={0}
                      value={price}
                      onChange={e => setPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0 for Free"
                      className="input-field"
                      style={{ paddingLeft: 34, height: 42, fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Course Cover Image
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: uploadingThumbnail ? 'not-allowed' : 'pointer',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: thumbnailUrl ? '#F0FDF4' : 'var(--slate-50)',
                    color: thumbnailUrl ? '#166534' : 'var(--navy-900)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                  }}>
                    <UploadCloud size={16} />
                    <span>{uploadingThumbnail ? 'Uploading image...' : thumbnailUrl ? 'Cover Image Ready ✓' : 'Upload Cover Image'}</span>
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
                    <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                      {thumbnailUrl}
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 12,
                paddingTop: 18,
                borderTop: '1px solid var(--border-subtle)',
              }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setCurrentPage('learner-dashboard')}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (!title.trim()) {
                      showToast({ title: 'Course title missing', description: 'Please provide a course title to continue.', tone: 'warning' });
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  icon={<ArrowRight size={15} />}
                >
                  Next: Curriculum Structure
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Content Modules */}
        {currentStep === 2 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-xs)',
            maxWidth: 820,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                  2. Curriculum Modules & Lessons
                </h2>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.86rem', marginTop: 2 }}>
                  Organize your syllabus into sequential modules, video lectures, and learning units.
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddModule}
                icon={<Plus size={14} />}
              >
                Add Module
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
              {modules.map((mod, mIdx) => (
                <div key={mIdx} style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  backgroundColor: 'var(--slate-50)',
                }}>
                  {/* Module Title Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: 'var(--navy-900)',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-color)',
                        padding: '4px 8px',
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
                        style={{ fontWeight: 600, backgroundColor: '#FFFFFF', height: 38, fontSize: '0.88rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAddLesson(mIdx)}
                        icon={<Plus size={13} />}
                      >
                        Add Lesson
                      </Button>
                      {modules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveModule(mIdx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger-text)',
                            cursor: 'pointer',
                            padding: 6,
                          }}
                          title="Delete module"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lessons list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {mod.lessons.map((lesson, lIdx) => (
                      <div key={lIdx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        backgroundColor: '#FFFFFF',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                      }}>
                        <Video size={15} color="var(--primary)" />
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={e => {
                            const updated = [...modules];
                            updated[mIdx].lessons[lIdx].title = e.target.value;
                            setModules(updated);
                          }}
                          className="input-field"
                          style={{ padding: '4px 10px', fontSize: '0.86rem', flex: 1, height: 34 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                            style={{ width: 56, height: 34, padding: '4px 6px', fontSize: '0.82rem' }}
                          />
                          <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>min</span>
                        </div>

                        {/* Video / Resource Upload Button */}
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: lesson.uploading ? 'not-allowed' : 'pointer',
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: lesson.videoUrl ? '#F0FDF4' : 'var(--slate-50)',
                          color: lesson.videoUrl ? '#166534' : 'var(--navy-900)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}>
                          <UploadCloud size={13} />
                          <span>{lesson.uploading ? 'Uploading...' : lesson.videoUrl ? 'Video Ready ✓' : 'Upload Video'}</span>
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
                            <Trash2 size={15} />
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
              paddingTop: 18,
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setCurrentStep(1)}
                icon={<ArrowLeft size={15} />}
              >
                Back: Metadata
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setCurrentStep(3)}
                icon={<ArrowRight size={15} />}
              >
                Next: Grading & Integrity
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-xs)',
            maxWidth: 820,
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
              3. Examination & Integrity Standards
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.86rem', marginBottom: 24 }}>
              Set passing score thresholds for official diploma generation and configure exam telemetry.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
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
                    style={{ maxWidth: 120, height: 42, fontSize: '0.94rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.84rem', color: 'var(--slate-500)' }}>
                    Scholars scoring at or above this threshold automatically receive a cryptographically signed diploma.
                  </span>
                </div>
              </div>

              {/* Anti-Cheating Switch Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={16} color="var(--primary)" />
                    <span>Real-Time Anti-Cheating Examination Telemetry</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: 2 }}>
                    Monitors browser window focus, tab switching, and proctoring events during assessments.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={antiCheatingEnabled}
                  onChange={e => setAntiCheatingEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>

              {/* Adaptive HLS Transcoding */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={16} color="var(--primary)" />
                    <span>Adaptive Multi-Bitrate Media Delivery</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: 2 }}>
                    Optimizes video streams for smooth low-bandwidth playback across mobile and regional networks.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hlsTranscoding}
                  onChange={e => setHlsTranscoding(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 18,
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setCurrentStep(2)}
                icon={<ArrowLeft size={15} />}
              >
                Back: Curriculum
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setCurrentStep(4)}
                icon={<ArrowRight size={15} />}
              >
                Next: Review & Publish
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Publish */}
        {currentStep === 4 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-xs)',
            maxWidth: 820,
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
              4. Review Curriculum Dossier & Publish
            </h2>
            <p style={{ color: 'var(--slate-500)', marginBottom: 20, fontSize: '0.86rem' }}>
              Verify syllabus structure, assessment passing benchmark, and catalog discovery.
            </p>

            <div style={{
              backgroundColor: 'var(--slate-50)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ backgroundColor: 'var(--slate-200)', color: 'var(--navy-900)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {category}
                </span>
                <span style={{ backgroundColor: 'var(--slate-200)', color: 'var(--navy-900)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {level}
                </span>
                <span style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {price === 0 ? 'Free Tuition' : `$${price} USD`}
                </span>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--navy-950)', marginBottom: 6 }}>
                {title || 'Untitled Course'}
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: 14, lineHeight: 1.5 }}>
                {description || 'No description provided.'}
              </p>

              <div style={{
                display: 'flex',
                gap: 16,
                fontSize: '0.82rem',
                color: 'var(--slate-500)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: 12,
                flexWrap: 'wrap',
              }}>
                <span><strong>{modules.length}</strong> Modules</span>
                <span>•</span>
                <span><strong>{modules.reduce((acc, m) => acc + m.lessons.length, 0)}</strong> Total Lessons</span>
                <span>•</span>
                <span>Passing Grade: <strong>{passingGrade}%</strong></span>
                <span>•</span>
                <span>Anti-Cheating Telemetry: <strong>{antiCheatingEnabled ? 'Active' : 'Disabled'}</strong></span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 18,
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setCurrentStep(3)}
                icon={<ArrowLeft size={15} />}
              >
                Back: Settings
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handlePublish}
                isLoading={isSubmitting}
                style={{ padding: '10px 28px' }}
              >
                {isSubmitting ? 'Publishing Course...' : 'Publish Course to Catalog'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
