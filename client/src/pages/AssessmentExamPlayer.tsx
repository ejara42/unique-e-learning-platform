import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { IAssessment, ICertificate } from '../types';
import {
  ShieldAlert,
  Clock,
  CheckCircle,
  AlertTriangle,
  Award,
  ArrowRight,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Button, ToastViewport, useToast } from '../components/ui';

export const AssessmentExamPlayer: React.FC = () => {
  const { selectedAssessmentId, setCurrentPage, openVerification, currentUser } = useApp();
  const { toast, showToast, dismissToast } = useToast();
  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [proctoringWarnings, setProctoringWarnings] = useState<string[]>([]);
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [startedAt] = useState<string>(new Date().toISOString());

  // Submission & Results State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    certificate?: ICertificate;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setCurrentPage('login');
      return;
    }
    if (selectedAssessmentId) {
      api.getAssessment(selectedAssessmentId)
        .then(res => {
          setAssessment(res.assessment);
          setTimeLeft((res.assessment?.durationMinutes || 30) * 60);
        })
        .catch(err => {
          console.error('[Assessment Load Error]', err.message);
          if (err.message && err.message.includes('Unauthorized')) {
            setCurrentPage('login');
          }
        });
    }
  }, [selectedAssessmentId, currentUser]);

  // Anti-Cheating Telemetry & Window Blur Detection
  useEffect(() => {
    if (!currentUser) return;

    const handleBlur = () => {
      const msg = `Proctoring Alert: Tab switch detected at ${new Date().toLocaleTimeString()}`;
      setProctoringWarnings(prev => [...prev, msg]);
      setWarningMessage(msg);
      setShowWarningToast(true);
      setTimeout(() => setShowWarningToast(false), 4000);

      if (selectedAssessmentId && currentUser) {
        api.recordTelemetry(selectedAssessmentId, 'TAB_BLUR', 'User switched out of exam window')
          .catch(() => {});
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handleBlur();
    });

    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedAssessmentId]);

  // Exam Countdown Timer
  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionIndex,
    });
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const answersPayload = Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
        questionId: qId,
        selectedOption: optIdx,
      }));

      const res = await api.submitAssessment(assessment.id, {
        answers: answersPayload,
        proctoringFlags: proctoringWarnings.map(flag => ({ type: 'TAB_BLUR', timestamp: new Date().toISOString(), details: flag })),
        startedAt,
      });

      setResult({
        score: res.percentageScore ?? res.submission?.scorePct ?? 0,
        passed: res.passed,
        certificate: res.certificate,
      });
    } catch (e: any) {
      showToast({ title: 'Submission failed', description: e.message || 'Unable to submit assessment.', tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!assessment) {
    if (!selectedAssessmentId) {
      return (
        <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.94rem' }}>No assessment selected.</p>
          <Button variant="primary" onClick={() => setCurrentPage('learner-dashboard')}>Return to Dashboard</Button>
        </div>
      );
    }
    return (
      <>
        <ToastViewport toast={toast} onDismiss={dismissToast} />
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
          <p style={{ color: 'var(--slate-500)', fontSize: '0.92rem' }}>Loading proctored examination environment...</p>
        </div>
      </>
    );
  }

  // ===================== RESULTS VIEW =====================
  if (result) {
    return (
      <>
        <ToastViewport toast={toast} onDismiss={dismissToast} />
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', padding: '48px 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: result.passed ? '#F0FDF4' : '#FEF2F2',
                color: result.passed ? '#166534' : '#991B1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: `1px solid ${result.passed ? '#BBF7D0' : '#FECACA'}`,
              }}>
                {result.passed ? <Award size={36} /> : <AlertTriangle size={36} />}
              </div>

              <span style={{
                display: 'inline-block',
                marginBottom: 10,
                backgroundColor: result.passed ? '#F0FDF4' : '#FEF2F2',
                color: result.passed ? '#166534' : '#991B1B',
                border: `1px solid ${result.passed ? '#BBF7D0' : '#FECACA'}`,
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {result.passed ? 'Examination Passed' : 'Passing Threshold Not Reached'}
              </span>

              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Score: {result.score}%
              </h1>

              <p style={{ color: 'var(--slate-600)', fontSize: '0.92rem', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>
                {result.passed
                  ? 'Congratulations! You have demonstrated core mastery of this syllabus. Your verifiable digital diploma has been generated.'
                  : `A passing benchmark of ${assessment.passingScorePct}% is required for certification. You may review module lectures and retake this exam.`}
              </p>

              {/* Verifiable Certificate Preview if passed */}
              {result.passed && result.certificate && (
                <div style={{
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  marginBottom: 28,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Cryptographic Diploma Issued
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-950)', marginTop: 2, fontFamily: 'monospace' }}>
                      {result.certificate.certificateNumber}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      Accredited by {result.certificate.institutionName || 'Institutional Partner'}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => openVerification(result.certificate!.certificateNumber)}
                    icon={<QrCode size={15} />}
                  >
                    Verify Credential
                  </Button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentPage('my-courses')}
                >
                  Return to My Courses
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ===================== EXAM PLAYER VIEW =====================
  const currentQ = assessment.questions[currentQIndex];
  const isTimeCritical = timeLeft < 300; // less than 5 mins

  return (
    <>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
      <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Proctoring Warning Toast */}
        {showWarningToast && (
          <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
            backgroundColor: '#991B1B',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.84rem',
            fontWeight: 600,
          }}>
            <ShieldAlert size={18} color="#FCA5A5" />
            <span>{warningMessage}</span>
          </div>
        )}

        {/* Top Proctoring & Timer Header */}
        <header style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-color)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'var(--slate-100)',
              color: 'var(--navy-900)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}>
              <ShieldCheck size={14} color="var(--primary)" />
              <span>Proctored Assessment</span>
            </span>
            <span style={{ fontWeight: 700, color: 'var(--navy-950)', fontSize: '0.96rem' }}>
              {assessment.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Time Remaining Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isTimeCritical ? '#FEF2F2' : 'var(--slate-100)',
              color: isTimeCritical ? '#DC2626' : 'var(--navy-950)',
              border: `1px solid ${isTimeCritical ? '#FECACA' : 'var(--border-color)'}`,
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}>
              <Clock size={14} />
              <span>Time Left: {formatTimer(timeLeft)}</span>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Submit Exam
            </Button>
          </div>
        </header>

        {/* Exam Body */}
        <main style={{ flex: 1, maxWidth: 800, width: '100%', margin: '32px auto', padding: '0 24px' }}>
          {/* Question Counter Card */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}>
            <span style={{ fontSize: '0.84rem', color: 'var(--slate-500)', fontWeight: 600 }}>
              Question {currentQIndex + 1} of {assessment.questions.length}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
              {currentQ.points} Points
            </span>
          </div>

          {/* Question Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-xs)',
            marginBottom: 24,
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 20, lineHeight: 1.4 }}>
              {currentQ.prompt}
            </h2>

            {/* Options Radio List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(currentQ.options || []).map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === optIdx;
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--slate-50)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: isSelected ? '5px solid var(--primary)' : '1px solid var(--slate-400)',
                      backgroundColor: '#FFFFFF',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '0.92rem',
                      color: isSelected ? 'var(--navy-950)' : 'var(--slate-700)',
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {opt}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
              disabled={currentQIndex === 0}
              icon={<ArrowLeft size={14} />}
            >
              Previous
            </Button>

            {currentQIndex < assessment.questions.length - 1 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentQIndex(currentQIndex + 1)}
                icon={<ArrowRight size={14} />}
              >
                Next Question
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                Finish & Submit Exam
              </Button>
            )}
          </div>
        </main>
      </div>
    </>
  );
};
