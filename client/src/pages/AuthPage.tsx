import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Logo } from '../components/Logo';
import { MinistryLogo } from '../components/MinistryLogo';
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  LogIn,
  UserPlus,
  Sparkles,
  ArrowLeft,
  KeyRound,
  BookOpen
} from 'lucide-react';
import { UserRole } from '../types';
import { Button } from '../components/ui';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signin' }) => {
  const { loginUser, registerUser, setCurrentPage, t, isRTL } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(initialMode);

  // Dynamic Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Dynamic Sign Up State
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [institutionName, setInstitutionName] = useState('');

  // Password Recovery State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setSuccessMsg(res.message || 'If an account exists, recovery instructions have been dispatched.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      setErrorMsg('Please enter the security token from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const res = await api.resetPassword(resetToken.trim(), newPassword);
      setSuccessMsg(res.message || 'Password successfully updated! You may now sign in.');
      setSignInEmail(forgotEmail);
      setTimeout(() => {
        setMode('signin');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. The code may be expired or invalid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      await loginUser(signInEmail, signInPassword);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      setErrorMsg('Please enter your full name, email, and password');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await registerUser(fullName, signUpEmail, signUpPassword, selectedRole, institutionName);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: '#FFFFFF',
      flexWrap: 'wrap',
    }}>
      {/* Left National Branded Storytelling Panel */}
      <div style={{
        flex: '1 1 480px',
        minHeight: '100vh',
        backgroundColor: 'var(--navy-950)',
        color: '#FFFFFF',
        padding: '56px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        borderRight: '1px solid var(--navy-800)',
      }}>
        {/* Top: Ministry & Brand Navigation */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            onClick={() => setCurrentPage('landing')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              marginBottom: 40,
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Logo size={28} />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>EduSphere</div>
              <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MinistryLogo size={13} />
                <span>{t.nationalPortal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mission & High-Trust Features */}
        <div style={{ maxWidth: 460, position: 'relative', zIndex: 2, margin: '24px 0' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#E2E8F0',
            marginBottom: 20,
          }}>
            <ShieldCheck size={14} color="var(--primary-hover)" />
            <span>Accredited Academic Infrastructure</span>
          </div>

          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 16,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
          }}>
            {t.heroTitle} <span style={{ color: '#60A5FA' }}>{t.heroHighlight}</span>
          </h2>

          <p style={{ fontSize: '0.98rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: 28 }}>
            {t.heroSubtitle}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.88rem', color: '#E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={14} color="#10B981" />
              </div>
              <span style={{ fontWeight: 600 }}>Unified National Accreditation Standards</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={14} color="#10B981" />
              </div>
              <span style={{ fontWeight: 600 }}>Low-Latency WebRTC Live Classrooms</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={14} color="#10B981" />
              </div>
              <span style={{ fontWeight: 600 }}>Cryptographically Verified SHA-256 Diplomas</span>
            </div>
          </div>
        </div>

        {/* Bottom: Guarantee */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.8rem',
          color: '#64748B',
          borderTop: '1px solid var(--navy-800)',
          paddingTop: 18,
          position: 'relative',
          zIndex: 2,
        }}>
          <ShieldCheck size={16} color="#60A5FA" />
          <span>{t.footerAccreditation}</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={{
        flex: '1 1 480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 36px',
        maxWidth: 580,
        margin: '0 auto',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'var(--slate-50)',
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          padding: '32px 32px 28px',
        }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 22,
        }}>
          <div>
            <div style={{ fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)' }}>Secure access</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.03em', marginTop: 4 }}>
              {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Reset Password' : 'Set New Password'}
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--teal-50)',
            border: '1px solid rgba(13,148,136,0.18)',
            color: 'var(--teal-700)',
            borderRadius: 999,
            padding: '7px 10px',
            fontSize: '0.74rem',
            fontWeight: 800,
          }}>
            <ShieldCheck size={14} />
            <span>Verified</span>
          </div>
        </div>

        {/* Toggle Mode Tabs (Sign In vs Register vs Back) */}
        {mode === 'forgot' || mode === 'reset' ? (
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </button>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: 'var(--slate-100)',
            padding: 4,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            marginBottom: 28,
          }}>
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: mode === 'signin' ? '#FFFFFF' : 'transparent',
                color: mode === 'signin' ? 'var(--navy-950)' : 'var(--text-muted)',
                fontWeight: mode === 'signin' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: mode === 'signin' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
                fontSize: '0.92rem',
              }}
            >
              <LogIn size={16} color={mode === 'signin' ? 'var(--primary)' : 'currentColor'} />
              <span>{t.signIn}</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: mode === 'signup' ? '#FFFFFF' : 'transparent',
                color: mode === 'signup' ? 'var(--navy-950)' : 'var(--text-muted)',
                fontWeight: mode === 'signup' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: mode === 'signup' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
                fontSize: '0.92rem',
              }}
            >
              <UserPlus size={16} color={mode === 'signup' ? 'var(--primary)' : 'currentColor'} />
              <span>{t.signUp}</span>
            </button>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.68rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {mode === 'signin'
              ? t.signInTitle
              : mode === 'signup'
              ? t.signUpTitle
              : mode === 'forgot'
              ? 'Recover Password'
              : 'Set New Password'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
            {mode === 'signin'
              ? t.signInSubtitle
              : mode === 'signup'
              ? t.signUpSubtitle
              : mode === 'forgot'
              ? 'Enter your registered email address and we will dispatch secure recovery instructions.'
              : 'Enter your recovery code and choose a new secure password.'}
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <CheckCircle size={18} color="#059669" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                {t.emailLabel} *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            >
              {isLoading ? 'Dispatching...' : 'Send Recovery Instructions'}
            </Button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: '0.88rem' }}>
              <button
                type="button"
                onClick={() => { setMode('reset'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Have a recovery code? Enter token →
              </button>
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : mode === 'reset' ? (
          /* RESET PASSWORD FORM */
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                Recovery Token / Code *
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="text"
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  placeholder="Paste the token sent to your email"
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46, fontFamily: 'monospace' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                New Password * (minimum 8 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                Confirm New Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : mode === 'signin' ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                {t.emailLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="email"
                  value={signInEmail}
                  onChange={e => setSignInEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                {t.passwordLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="password"
                  value={signInPassword}
                  onChange={e => setSignInPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--slate-600)', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                />
                <span>{t.rememberMe}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(signInEmail);
                  setMode('forgot');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                {t.forgotPassword}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            >
              {isLoading ? 'Authenticating...' : t.signInBtn}
            </Button>

            {/* Switch to Sign Up */}
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {t.dontHaveAccount}{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
                style={{ color: 'var(--primary)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t.signUp}
              </button>
            </div>
          </form>
        ) : (
          /* SIGN UP FORM */
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                {t.fullNameLabel} *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                {t.emailLabel} *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={e => setSignUpEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                {t.passwordLabel} *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={e => setSignUpPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="input-field"
                  style={{ paddingLeft: 42, height: 46 }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  {t.roleLabel}
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  className="input-field"
                  style={{ height: 46 }}
                >
                  <option value="STUDENT">{t.roleStudent}</option>
                  <option value="INSTRUCTOR">{t.roleTeacher}</option>
                  <option value="INDEPENDENT_LEARNER">{t.roleIndependent}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  {t.institutionLabel}
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                  <input
                    type="text"
                    value={institutionName}
                    onChange={e => setInstitutionName(e.target.value)}
                    placeholder={t.institutionPlaceholder}
                    className="input-field"
                    style={{ paddingLeft: 42, height: 46 }}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            >
              {isLoading ? 'Creating Account...' : t.signUpBtn}
            </Button>

            {/* Switch to Sign In */}
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {t.alreadyHaveAccount}{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); }}
                style={{ color: 'var(--primary)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t.signIn}
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};
