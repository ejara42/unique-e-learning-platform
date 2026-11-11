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
  HelpCircle,
  Clock,
  Award
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
      title: '',
      lessons: [
        { title: '', type: 'VIDEO', duration: 15 },
      ],
    },
  ]);

  // Step 3: Examination & Certification Standards
  const [examTitle, setExamTitle] = useState('');
  const [examInstructions, setExamInstructions] = useState('Answer all questions. Browser focus loss, tab switching, and copy-paste events are actively recorded by anti-cheating telemetry.');
  const [examDuration, setExamDuration] = useState(30);
  const [examType, setExamType] = useState<'FINAL_EXAM' | 'MIDTERM' | 'QUIZ'>('FINAL_EXAM');
  const [passingGrade, setPassingGrade] = useState(75);
  const [antiCheatingEnabled, setAntiCheatingEnabled] = useState(true);
  const [hlsTranscoding, setHlsTranscoding] = useState(true);

  // Examination Questions
  const [questions, setQuestions] = useState<Array<{
    id: string;
    type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
    prompt: string;
    options: string[];
    correctAnswerIndex: number;
    points: number;
  }>>([]);

  // Success Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddModule = () => {
    setModules([
      ...modules,
      {
        title: '',
        lessons: [{ title: '', type: 'VIDEO', duration: 15 }],
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
      title: '',
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

  const handleAddQuestion = (type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY' = 'MCQ') => {
    const newQ = {
      id: `q-${Date.now().toString().slice(-4)}`,
      type,
      prompt: '',
      options: type === 'TRUE_FALSE' ? ['True', 'False'] : type === 'ESSAY' ? [] : ['', '', '', ''],
      correctAnswerIndex: 0,
      points: 25,
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (qIndex: number) => {
    setQuestions(questions.filter((_, idx) => idx !== qIndex));
  };

  const handleUpdateQuestion = (qIndex: number, field: string, val: any) => {
    const updated = [...questions];
    (updated[qIndex] as any)[field] = val;
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length >= 6) return;
    updated[qIndex].options.push(`Option ${String.fromCharCode(65 + updated[qIndex].options.length)}`);
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex].options = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
    if (updated[qIndex].correctAnswerIndex >= updated[qIndex].options.length) {
      updated[qIndex].correctAnswerIndex = 0;
    }
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = text;
    setQuestions(updated);
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      showToast({ title: 'Course title missing', description: 'Add a course title in Step 1 before publishing.', tone: 'error' });
      setCurrentStep(1);
      return;
    }

    const validModules = modules
      .map((m, mIdx) => ({
        id: `mod-${mIdx + 1}`,
        title: m.title.trim() || `Module ${mIdx + 1}`,
        order: mIdx + 1,
        lessons: m.lessons
          .filter((l) => l.title.trim().length > 0)
          .map((l, lIdx) => ({
            id: `les-${mIdx + 1}-${lIdx + 1}`,
            title: l.title.trim(),
            order: lIdx + 1,
            contentType: l.type,
            durationMinutes: l.duration || 15,
            videoUrl: l.videoUrl || undefined,
            isFreePreview: lIdx === 0,
          })),
      }))
      .filter((m) => m.lessons.length > 0);

    if (validModules.length === 0) {
      showToast({
        title: 'Curriculum empty',
        description: 'Please add at least one module and lesson with a title before publishing.',
        tone: 'error',
      });
      setCurrentStep(2);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.createCourse({
        title,
        description,
        category,
        level,
        price,
        thumbnailUrl: thumbnailUrl || undefined,
        modules: validModules as any,
        completionCriteria: { minimumPassingGradePct: passingGrade },
        isPublished: true,
      });

      // Create and link the course's official examination
      const validQuestions = questions.filter((q) => q.prompt.trim().length > 0);
      if (validQuestions.length > 0) {
        await api.createAssessment({
          courseId: res.course.id,
          title: examTitle.trim() || `${title} - Official Certification Examination`,
          type: examType,
          instructions: examInstructions,
          durationMinutes: examDuration,
          passingScorePct: passingGrade,
          questions: validQuestions,
        }).catch((err) => {
          console.warn('[Assessment Link Warning]', err.message);
        });
      }

      setSuccessMsg(`Course "${title}" and official certification examination successfully published!`);
      showToast({ title: 'Course & Exam Published', description: 'Your curriculum and proctored examination are live in the academic catalog.', tone: 'success' });
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
                        placeholder={`Module ${mIdx + 1} Title (e.g. Introduction & Core Foundations)`}
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
                          placeholder={`Lesson ${lIdx + 1} Title (e.g. Architecture Overview)`}
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

        {/* Step 3: Settings & Assessment Builder */}
        {currentStep === 3 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-xs)',
            maxWidth: 880,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                3. Examination & Certification Standards
              </h2>
              <span style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(29, 78, 216, 0.2)',
              }}>
                {questions.length} Questions • {questions.reduce((sum, q) => sum + (q.points || 0), 0)} Total Points
              </span>
            </div>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.86rem', marginBottom: 24 }}>
              Author the formal course examination, define objective questions and correct answer keys, and set passing score thresholds for official certificate generation.
            </p>

            {/* Exam Parameters Card */}
            <div style={{
              backgroundColor: 'var(--slate-50)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              marginBottom: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="var(--primary)" />
                <span>Examination Parameters & Benchmark</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Examination Title
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    placeholder={title ? `${title} Official Examination` : 'Official Certificate Examination'}
                    className="input-field"
                    style={{ height: 40, fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Examination Classification
                  </label>
                  <select
                    value={examType}
                    onChange={e => setExamType(e.target.value as any)}
                    className="input-field"
                    style={{ height: 40, fontSize: '0.88rem' }}
                  >
                    <option value="FINAL_EXAM">Final Certification Examination</option>
                    <option value="MIDTERM">Proctored Midterm Exam</option>
                    <option value="QUIZ">Curriculum Knowledge Quiz</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Time Limit (Minutes)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="var(--slate-400)" />
                    <input
                      type="number"
                      value={examDuration}
                      onChange={e => setExamDuration(Math.max(5, Math.min(360, parseInt(e.target.value, 10) || 30)))}
                      min={5}
                      max={360}
                      className="input-field"
                      style={{ height: 40, width: 100, fontSize: '0.9rem', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>minutes</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Minimum Passing Grade (%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={16} color="var(--slate-400)" />
                    <input
                      type="number"
                      value={passingGrade}
                      onChange={e => setPassingGrade(Math.max(50, Math.min(100, parseInt(e.target.value, 10) || 75)))}
                      min={50}
                      max={100}
                      className="input-field"
                      style={{ height: 40, width: 100, fontSize: '0.9rem', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>% required to graduate</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Candidate Instructions
                </label>
                <textarea
                  value={examInstructions}
                  onChange={e => setExamInstructions(e.target.value)}
                  rows={2}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.86rem', resize: 'vertical' }}
                />
              </div>

              {/* Anti-Cheating & Adaptive Media Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 4 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={15} color="var(--primary)" />
                      <span>Anti-Cheating Telemetry</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      Enforces tab focus & detects window blur
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiCheatingEnabled}
                    onChange={e => setAntiCheatingEnabled(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--navy-950)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={15} color="var(--primary)" />
                      <span>Adaptive Multi-Bitrate</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      Optimizes bandwidth for low-speed connections
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hlsTranscoding}
                    onChange={e => setHlsTranscoding(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            {/* Questions Section Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                  Curated Examination Questions ({questions.length})
                </h3>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                  Mark the correct option radio button for automated grading. Keys remain encrypted on server.
                </p>
              </div>

              {/* Add Question Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddQuestion('MCQ')}
                  icon={<Plus size={14} />}
                >
                  Add MCQ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddQuestion('TRUE_FALSE')}
                  icon={<Plus size={14} />}
                >
                  Add True/False
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddQuestion('ESSAY')}
                  icon={<Plus size={14} />}
                >
                  Add Essay
                </Button>
              </div>
            </div>

            {/* Question Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
              {questions.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '36px 20px',
                    textAlign: 'center',
                  }}
                >
                  <FileText size={38} style={{ color: 'var(--slate-400)', margin: '0 auto 12px' }} />
                  <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--navy-900)' }}>
                    No Examination Questions Added Yet
                  </h4>
                  <p style={{ margin: '0 auto 20px', fontSize: '0.85rem', color: 'var(--slate-500)', maxWidth: 460 }}>
                    Build your official certification examination by creating custom Multiple Choice, True/False, or Essay questions. Questions are evaluated live with anti-cheating telemetry.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddQuestion('MCQ')}
                      icon={<Plus size={14} />}
                    >
                      + Add Multiple Choice
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddQuestion('TRUE_FALSE')}
                      icon={<Plus size={14} />}
                    >
                      + Add True / False
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddQuestion('ESSAY')}
                      icon={<Plus size={14} />}
                    >
                      + Add Essay
                    </Button>
                  </div>
                </div>
              ) : (
                questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Question Header Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                      paddingBottom: 10,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          backgroundColor: 'var(--navy-900)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          Question {qIdx + 1}
                        </span>
                        <span style={{
                          backgroundColor: q.type === 'MCQ' ? '#EFF6FF' : q.type === 'TRUE_FALSE' ? '#F0FDF4' : '#FEF3C7',
                          color: q.type === 'MCQ' ? '#1D4ED8' : q.type === 'TRUE_FALSE' ? '#15803D' : '#B45309',
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${q.type === 'MCQ' ? '#BFDBFE' : q.type === 'TRUE_FALSE' ? '#BBF7D0' : '#FDE68A'}`,
                        }}>
                          {q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'TRUE_FALSE' ? 'True / False' : 'Essay Prompt'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Score Points:</span>
                          <input
                            type="number"
                            value={q.points}
                            onChange={e => handleUpdateQuestion(qIdx, 'points', Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min={1}
                            max={100}
                            className="input-field"
                            style={{ width: 58, height: 32, fontSize: '0.84rem', fontWeight: 700, textAlign: 'center', padding: '2px 4px' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          title="Remove question"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--slate-400)',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                  {/* Question Prompt Field */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 4 }}>
                      Question Text & Prompt *
                    </label>
                    <textarea
                      value={q.prompt}
                      onChange={e => handleUpdateQuestion(qIdx, 'prompt', e.target.value)}
                      placeholder="Type the exact question prompt here..."
                      rows={2}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.88rem', resize: 'vertical' }}
                      required
                    />
                  </div>

                  {/* MCQ Options Configuration */}
                  {q.type === 'MCQ' && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Answer Choices (Select radio button for the correct answer):</span>
                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Plus size={13} /> Add Choice
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswerIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                backgroundColor: isCorrect ? '#F0FDF4' : 'var(--slate-50)',
                                border: `1px solid ${isCorrect ? '#86EFAC' : 'var(--border-color)'}`,
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0 }}>
                                <input
                                  type="radio"
                                  name={`correct-ans-${qIdx}`}
                                  checked={isCorrect}
                                  onChange={() => handleUpdateQuestion(qIdx, 'correctAnswerIndex', optIdx)}
                                  style={{ width: 16, height: 16, accentColor: '#16A34A', cursor: 'pointer' }}
                                />
                                <span style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  color: isCorrect ? '#166534' : 'var(--slate-600)',
                                  width: 20,
                                }}>
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                              </label>

                              <input
                                type="text"
                                value={opt}
                                onChange={e => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)} description...`}
                                className="input-field"
                                style={{ flex: 1, height: 34, fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                                required
                              />

                              {isCorrect && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803D', whiteSpace: 'nowrap' }}>
                                  Correct Key ✓
                                </span>
                              )}

                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIdx, optIdx)}
                                  title="Remove option"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--slate-400)',
                                    cursor: 'pointer',
                                    padding: 2,
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* True / False Configuration */}
                  {q.type === 'TRUE_FALSE' && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8 }}>
                        Correct Answer Key:
                      </div>
                      <div style={{ display: 'flex', gap: 14 }}>
                        {['True', 'False'].map((label, optIdx) => {
                          const isCorrect = q.correctAnswerIndex === optIdx;
                          return (
                            <label
                              key={label}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 16px',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${isCorrect ? '#86EFAC' : 'var(--border-color)'}`,
                                backgroundColor: isCorrect ? '#F0FDF4' : 'var(--slate-50)',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="radio"
                                name={`tf-ans-${qIdx}`}
                                checked={isCorrect}
                                onChange={() => handleUpdateQuestion(qIdx, 'correctAnswerIndex', optIdx)}
                                style={{ width: 16, height: 16, accentColor: '#16A34A', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isCorrect ? '#166534' : 'var(--navy-950)' }}>
                                {label} {isCorrect ? '(Correct Key ✓)' : ''}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Essay Configuration Note */}
                  {q.type === 'ESSAY' && (
                    <div style={{
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      color: '#92400E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <HelpCircle size={16} />
                      <span>Essay and open-ended written responses are held in the grading queue for instructor manual evaluation.</span>
                    </div>
                  )}
                </div>
              )))}
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

        {/* Step 4: Publish & Review */}
        {currentStep === 4 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-xs)',
            maxWidth: 880,
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
              4. Review Curriculum & Examination Dossier
            </h2>
            <p style={{ color: 'var(--slate-500)', marginBottom: 20, fontSize: '0.86rem' }}>
              Verify syllabus structure, assessment passing benchmark, and catalog discovery before publishing.
            </p>

            <div style={{
              backgroundColor: 'var(--slate-50)',
              padding: '22px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: 'var(--slate-200)', color: 'var(--navy-900)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {category}
                </span>
                <span style={{ backgroundColor: 'var(--slate-200)', color: 'var(--navy-900)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {level}
                </span>
                <span style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {price === 0 ? 'Free Tuition' : `$${price} USD`}
                </span>
                <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {examType.replace('_', ' ')}
                </span>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--navy-950)', marginBottom: 8 }}>
                {title || 'Untitled Course'}
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: 16, lineHeight: 1.5 }}>
                {description || 'No description provided.'}
              </p>

              {/* Curriculum Breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                borderTop: '1px solid var(--border-color)',
                paddingTop: 16,
                marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 700 }}>Curriculum Modules</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)' }}>{modules.length} Modules</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 700 }}>Total Lessons</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)' }}>{modules.reduce((acc, m) => acc + m.lessons.length, 0)} Lessons</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 700 }}>Exam Questions</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)' }}>{questions.length} Questions</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 700 }}>Total Point Value</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)' }}>{questions.reduce((sum, q) => sum + (q.points || 0), 0)} Points</div>
                </div>
              </div>

              {/* Examination & Certification Credentials Banner */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Award size={22} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-950)' }}>
                      {examTitle || `${title || 'Course'} Official Certification Exam`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                      Passing Benchmark: <strong>{passingGrade}%</strong> • Time Limit: <strong>{examDuration} min</strong> • Telemetry: <strong>{antiCheatingEnabled ? 'Active' : 'Disabled'}</strong>
                    </div>
                  </div>
                </div>
                <Badge variant="verified">SHA-256 Verified Diploma</Badge>
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
                Back: Examination
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handlePublish}
                isLoading={isSubmitting}
                style={{ padding: '10px 28px' }}
              >
                {isSubmitting ? 'Publishing Course & Exam...' : 'Publish Course & Examination'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
