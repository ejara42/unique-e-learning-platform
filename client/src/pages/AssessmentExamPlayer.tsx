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
  HelpCircle,
  FileCheck2,
  ArrowLeft,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { Button, Badge, ToastViewport, useToast } from '../components/ui';

export const AssessmentExamPlayer: React.FC = () => {
  const { selectedAssessmentId, setCurrentPage, openVerification } = useApp();
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
    if (selectedAssessmentId) {
      api.getAssessment(selectedAssessmentId).then(res => {
        setAssessment(res.assessment);
        setTimeLeft((res.assessment?.durationMinutes || 30) * 60);
      });
    }
  }, [selectedAssessmentId]);

  // Anti-Cheating Telemetry & Window Blur Detection
  useEffect(() => {
    const handleBlur = () => {
      const msg = `Proctoring Alert: Tab switch detected at ${new Date().toLocaleTimeString()}`;
      setProctoringWarnings(prev => [...prev, msg]);
      setWarningMessage(msg);
      setShowWarningToast(true);
      setTimeout(() => setShowWarningToast(false), 4000);

      if (selectedAssessmentId) {
        api.recordTelemetry(selectedAssessmentId, 'TAB_BLUR', 'User switched out of exam window');
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
          <p style={{ color: 'var(--text-muted)' }}>Loading assessment environment & proctoring sensors...</p>
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
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: result.passed ? 'var(--teal-50)' : '#FEF2F2',
              color: result.passed ? 'var(--teal-600)' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              border: `2px solid ${result.passed ? 'var(--teal-200)' : '#FECACA'}`,
            }}>
              {result.passed ? <Award size={44} /> : <AlertTriangle size={44} />}
            </div>

            <span style={{
              display: 'inline-block',
              marginBottom: 12,
            }}>
              <Badge variant={result.passed ? 'teal' : 'danger'}>
                {result.passed ? 'EXAMINATION PASSED' : 'PASSING THRESHOLD NOT REACHED'}
              </Badge>
            </span>

            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 12 }}>
              Score: {result.score}%
            </h1>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
              {result.passed
                ? 'Outstanding achievement! You have satisfied all academic competencies and earned an accredited verifiable diploma.'
                : `Passing grade required is ${assessment.passingScorePct}%. Review the course modules and retake when prepared.`}
            </p>

            {/* Verifiable Certificate Preview if passed */}
            {result.passed && result.certificate && (
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '2px solid #BFDBFE',
                borderRadius: 'var(--radius-xl)',
                padding: 24,
                marginBottom: 32,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Verifiable Credential Issued
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: 2 }}>
                    {result.certificate.certificateNumber}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--primary)', marginTop: 2 }}>
                    Issued by {result.certificate.institutionName || 'Institution Partner'}
                  </div>
                </div>

                <Button
                  variant="teal"
                  onClick={() => openVerification(result.certificate!.certificateNumber)}
                  icon={<QrCode size={16} />}
                >
                  Verify Authenticity
                </Button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setCurrentPage('my-courses')}
              >
                Back to My Courses
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
          top: 24,
          right: 24,
          zIndex: 1000,
          backgroundColor: '#991B1B',
          color: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.88rem',
          fontWeight: 700,
          animation: 'fadeIn 0.2s ease',
        }}>
          <ShieldAlert size={20} color="#FCA5A5" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Top Proctoring & Timer Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            color: 'var(--primary)',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 800,
          }}>
            <ShieldCheck size={15} />
            <span>Proctored Assessment</span>
          </span>
          <span style={{ fontWeight: 800, color: 'var(--navy-950)', fontSize: '1.05rem' }}>
            {assessment.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Time Remaining Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: isTimeCritical ? '#FEF2F2' : 'var(--slate-100)',
            color: isTimeCritical ? '#DC2626' : 'var(--navy-950)',
            border: `1px solid ${isTimeCritical ? '#FECACA' : 'var(--slate-200)'}`,
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: '0.88rem',
            fontWeight: 800,
          }}>
            <Clock size={16} />
            <span>Time Left: {formatTimer(timeLeft)}</span>
          </div>

          <Button
            size="sm"
            variant="teal"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Exam Body */}
      <main style={{ flex: 1, maxWidth: 840, width: '100%', margin: '36px auto', padding: '0 24px' }}>
        {/* Question Counter Card */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Question {currentQIndex + 1} of {assessment.questions.length}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
            {currentQ.points} Points
          </span>
        </div>

        {/* Question Card */}
        <div className="card" style={{ padding: 36, marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 24, lineHeight: 1.4 }}>
            {currentQ.prompt}
          </h2>

          {/* Options Radio List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(currentQ.options || []).map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === optIdx;
              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-lg)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--primary-light)' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: isSelected ? '6px solid var(--primary)' : '2px solid var(--slate-300)',
                    backgroundColor: '#FFFFFF',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '0.96rem',
                    color: isSelected ? 'var(--navy-950)' : 'var(--slate-800)',
                    fontWeight: isSelected ? 700 : 500,
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
            onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
            disabled={currentQIndex === 0}
            icon={<ArrowLeft size={16} />}
          >
            Previous
          </Button>

          {currentQIndex < assessment.questions.length - 1 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentQIndex(currentQIndex + 1)}
              icon={<ArrowRight size={16} />}
            >
              Next Question
            </Button>
          ) : (
            <Button
              variant="teal"
              size="lg"
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
