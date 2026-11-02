import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
  ArrowLeft
} from 'lucide-react';
import { UserRole } from '../types';
import { Button } from '../components/ui';

interface AuthPageProps {
  initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signin' }) => {
  const { loginUser, registerUser, setCurrentPage, t, isRTL } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

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

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        background: 'linear-gradient(145deg, var(--navy-950) 0%, var(--navy-900) 45%, #2563EB 100%)',
        color: '#FFFFFF',
        padding: '56px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle Background Radial Highlights */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

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
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Logo size={32} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>EduSphere</div>
              <div style={{ fontSize: '0.74rem', color: '#93C5FD', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MinistryLogo size={14} />
                <span>{t.nationalPortal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mission & High-Trust Features */}
        <div style={{ maxWidth: 480, position: 'relative', zIndex: 2, margin: '24px 0' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#E0E7FF',
            marginBottom: 20,
          }}>
            <Sparkles size={14} color="#FBBF24" />
            <span>Accredited Academic Infrastructure</span>
          </div>

          <h2 style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 16,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
          }}>
            {t.heroTitle} <span style={{ color: '#93C5FD' }}>{t.heroHighlight}</span>
          </h2>

          <p style={{ fontSize: '1.02rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: 28 }}>
            {t.heroSubtitle}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.9rem', color: '#F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={15} color="#34D399" />
              </div>
              <span style={{ fontWeight: 600 }}>Unified National Accreditation Standards</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={15} color="#34D399" />
              </div>
              <span style={{ fontWeight: 600 }}>Interactive Live WebRTC Virtual Classrooms</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={15} color="#34D399" />
              </div>
              <span style={{ fontWeight: 600 }}>Cryptographically Verified QR Diplomas</span>
            </div>
          </div>
        </div>

        {/* Bottom: ISO Guarantee */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.82rem',
          color: '#94A3B8',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: 20,
          position: 'relative',
          zIndex: 2,
        }}>
          <ShieldCheck size={18} color="#60A5FA" />
          <span>{t.footerAccreditation}</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={{
        flex: '1 1 480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 40px',
        maxWidth: 620,
        margin: '0 auto',
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(148,163,184,0.25)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: '0 28px 45px -28px rgba(15, 23, 42, 0.45)',
          padding: '28px 28px 24px',
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
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.03em', marginTop: 4 }}>{mode === 'signin' ? 'Welcome back' : 'Create account'}</div>
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

        {/* Toggle Mode Tabs (Sign In vs Register) */}
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
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
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
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
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

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.68rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {mode === 'signin' ? t.signInTitle : t.signUpTitle}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
            {mode === 'signin' ? t.signInSubtitle : t.signUpSubtitle}
          </p>
        </div>

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

        {/* SIGN IN FORM */}
        {mode === 'signin' ? (
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
              <a href="#forgot" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t.forgotPassword}</a>
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
