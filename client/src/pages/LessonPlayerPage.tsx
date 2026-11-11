import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  MonitorPlay,
  PlayCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Sparkles,
  Download,
  Share2,
  Volume2,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICourse, ILesson } from '../types';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';

export const LessonPlayerPage: React.FC = () => {
  const {
    selectedCourseId,
    selectedLessonId,
    setSelectedLessonId,
    setCurrentPage,
    startExam,
  } = useApp();

  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'resources'>('overview');

  // TanStack Query for caching and instant updates
  const { data: courseData, isLoading } = useQuery({
    queryKey: ['course-detail', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null;
      const res = await api.getCourse(selectedCourseId);
      return res.course;
    },
    enabled: Boolean(selectedCourseId),
    staleTime: 60_000,
  });

  const course = courseData ?? null;

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

  // Mark lesson progress on first view
  useEffect(() => {
    if (!selectedCourseId || !lesson) return;
    if (completedLessons[lesson.id]) return;

    api.updateProgress(selectedCourseId, lesson.id)
      .then(() => {
        setCompletedLessons(prev => ({ ...prev, [lesson.id]: true }));
      })
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

  const handleVideoEnded = () => {
    if (selectedCourseId && lesson) {
      api.updateProgress(selectedCourseId, lesson.id);
      setCompletedLessons(prev => ({ ...prev, [lesson.id]: true }));
      toast.success('Lesson marked complete! Ready for next topic.', {
        description: lesson.title,
      });
    }
  };

  const handleStartExam = async () => {
    if (!course?.id) return;
    try {
      const res = await api.getAssessmentByCourse(course.id);
      if (res?.assessment?.id) {
        startExam(res.assessment.id);
        return;
      }
    } catch {
      // ignore
    }
    toast.error('No examination has been authored for this course yet.');
  };

  // High-Fidelity Skeleton Loader
  if (isLoading || !course || !lesson) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-40 rounded-xl bg-slate-800" />
            <Skeleton className="h-9 w-28 rounded-xl bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="w-full aspect-video rounded-3xl bg-slate-900 border border-slate-800" />
              <div className="space-y-3 p-2">
                <Skeleton className="h-7 w-2/3 bg-slate-800 rounded-lg" />
                <Skeleton className="h-4 w-1/3 bg-slate-800 rounded-lg" />
              </div>
            </div>

            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl bg-slate-900 border border-slate-800" />
              <Skeleton className="h-80 w-full rounded-2xl bg-slate-900 border border-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isVideo = lesson.contentType === 'VIDEO';
  const isDocument = lesson.contentType === 'DOCUMENT';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Cinematic Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setCurrentPage('course-detail')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Syllabus</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="truncate">
            <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider block sm:inline mr-2">
              {course.title}
            </span>
            <span className="text-xs text-slate-400 truncate hidden md:inline">
              / {lesson.title}
            </span>
          </div>
        </div>

        {/* Action Controls & Progress Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
            <span className="text-slate-400">Progress:</span>
            <span className="font-bold text-indigo-400">{Math.round(progressPercent)}%</span>
          </div>

          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title={isTheaterMode ? 'Exit Theater Mode' : 'Enter Theater Mode'}
          >
            {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden lg:inline text-xs font-medium">
              {isTheaterMode ? 'Standard' : 'Theater'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <div
          className={cn(
            'grid gap-8 items-start transition-all duration-300',
            isTheaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'
          )}
        >
          {/* Main Media Player & Tab Panel */}
          <div className={cn(isTheaterMode ? 'w-full' : 'lg:col-span-2', 'space-y-6')}>
            {/* Ambient Player Canvas */}
            <div className="relative rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl group">
              <div className="relative aspect-video w-full flex items-center justify-center bg-black">
                {isVideo ? (
                  <video
                    key={lesson.id}
                    controls
                    playsInline
                    poster={course.thumbnailUrl}
                    className="w-full h-full max-h-[640px] object-contain focus:outline-none"
                    onEnded={handleVideoEnded}
                  >
                    <source
                      src={
                        (lesson as any).videoUrl ||
                        (lesson as any).hlsUrl ||
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                      }
                      type="video/mp4"
                    />
                    Your browser does not support HTML5 video playback.
                  </video>
                ) : (
                  <div className="w-full h-full p-8 md:p-12 bg-slate-900/90 text-slate-200 flex flex-col justify-center max-w-2xl mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 ring-8 ring-indigo-500/10">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
                      {lesson.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                      This theoretical foundation module contains essential syllabus reading notes for{' '}
                      <span className="text-white font-medium">{course.title}</span>. Complete the foundational concepts before attempting the proctored assessment.
                    </p>
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        Key Competencies Covered:
                      </div>
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                        {course.learningOutcomes?.slice(0, 3).map((outcome, idx) => (
                          <li key={idx}>{outcome}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Controls Bar: Previous / Next & Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {lesson.contentType}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {lesson.durationMinutes} mins
                </span>
                {lesson.isFreePreview && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Free Preview
                  </span>
                )}
              </div>

              {/* Navigation Pagination Buttons */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  disabled={!previousLesson}
                  onClick={() => handleNavigateLesson(previousLesson)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
                    previousLesson
                      ? 'bg-slate-800 hover:bg-slate-700 text-white active:scale-95'
                      : 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  disabled={!nextLesson}
                  onClick={() => handleNavigateLesson(nextLesson)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
                    nextLesson
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-soft active:scale-95'
                      : 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
                  )}
                >
                  Next Lesson
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lesson Details Tabs */}
            <div className="rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 backdrop-blur-md">
              <div className="flex items-center gap-4 border-b border-slate-800 pb-3 mb-5">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    'text-sm font-bold pb-2 transition-all relative',
                    activeTab === 'overview'
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  Lesson Overview
                  {activeTab === 'overview' && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={cn(
                    'text-sm font-bold pb-2 transition-all relative',
                    activeTab === 'notes'
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  Faculty Notes
                  {activeTab === 'notes' && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                    />
                  )}
                </button>
              </div>

              {activeTab === 'overview' ? (
                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <h1 className="text-xl font-extrabold text-white tracking-tight">
                    {lesson.title}
                  </h1>
                  <p className="text-slate-400">
                    {course.tagline || 'Master essential concepts with this module.'}
                  </p>
                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span>Instructor: <strong className="text-slate-300">{course.instructorName}</strong></span>
                    <span>Institution: <strong className="text-slate-300">{course.institutionName || 'EduSphere Academy'}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Faculty reference notes and supplemental transcripts are verified under syllabus standards.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300">
                    Module ID: {lesson.id} • Duration: {lesson.durationMinutes} mins • Status: Verified
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Syllabus Sidebar */}
          <aside className="space-y-6">
            {/* Progress Card */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Course Progress</span>
                <span className="text-indigo-400">{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                />
              </div>
              <div className="text-xs text-slate-500">
                {completedCount} of {lessons.length} lessons completed
              </div>
            </div>

            {/* Curriculum Drawer */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-extrabold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Curriculum Modules
                </span>
                <span className="text-xs text-slate-500">{course.modules?.length || 0} Modules</span>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {course.modules?.map((mod, modIdx) => (
                  <div key={mod.id || modIdx} className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                      {mod.title}
                    </div>

                    <div className="space-y-1">
                      {mod.lessons?.map((les, lesIdx) => {
                        const isCurrent = les.id === lesson.id;
                        const isDone = completedLessons[les.id];

                        return (
                          <button
                            key={les.id || lesIdx}
                            onClick={() => setSelectedLessonId(les.id)}
                            className={cn(
                              'w-full text-left p-3 rounded-2xl text-xs font-medium transition-all flex items-center justify-between gap-3',
                              isCurrent
                                ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-soft'
                                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                            )}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : isCurrent ? (
                                <PlayCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                              ) : (
                                <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                                  {lesIdx + 1}
                                </span>
                              )}
                              <span className={cn('truncate', isCurrent && 'font-bold text-white')}>
                                {les.title}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-500 shrink-0">
                              {les.durationMinutes}m
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Assessment Gate Banner */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleStartExam}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-soft flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Award className="w-4 h-4" />
                  Take Proctored Exam & Certify
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
