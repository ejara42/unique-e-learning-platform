import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';
import { MinistryLogo } from './MinistryLogo';
import {
  ShieldCheck,
  Globe,
  Eye,
  Phone,
  LogIn,
  LogOut,
  LayoutDashboard,
  Building2,
  ChevronDown,
  Menu,
  X,
  Home,
  BookOpen,
  Sparkles,
  User,
  Search,
  ArrowRight
} from 'lucide-react';
import { LanguageCode } from '../i18n';

export const Header: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    currentUser,
    logoutUser,
    openVerification,
    language,
    setLanguage,
    t,
    fontScale,
    zoomFont,
    decreaseFont,
    resetFont,
    highContrast,
    toggleHighContrast,
    isRTL,
  } = useApp();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!langMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [langMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  const languages: Array<{ code: LanguageCode; label: string; native: string }> = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'am', label: 'Amharic', native: 'አማርኛ' },
    { code: 'om', label: 'Afaan Oromoo', native: 'Afaan Oromoo' },
    { code: 'ar', label: 'Arabic', native: 'العربية' },
    { code: 'fr', label: 'French', native: 'Français' },
  ];

  const currentLangObj = languages.find(l => l.code === language) || languages[0];

  const navItemClass = (isActive: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: '0.92rem',
    fontWeight: isActive ? 800 : 600,
    color: isActive ? 'var(--primary)' : '#334155',
    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
  });

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
    }}>
      <a
        href="#main-content"
        className="skip-link"
        onClick={() => {
          const mainElement = document.getElementById('main-content');
          if (mainElement) {
            mainElement.tabIndex = -1;
            mainElement.focus();
          }
        }}
      >
        Skip to content
      </a>
      {/* Top Tier: Official Ministry Endorsement & Accessibility Bar */}
      <div style={{
        backgroundColor: '#0F172A',
        color: '#E2E8F0',
        fontSize: '0.78rem',
        padding: '6px 24px',
        borderBottom: '1px solid #1E293B',
      }}>
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          {/* Official Ministry Endorsement & Dynamic Seal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#60A5FA',
              fontWeight: 700,
            }}>
              <MinistryLogo size={22} />
              <span>{t.ministryBadge}</span>
            </div>
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#94A3B8' }}>{t.nationalPortal}</span>
          </div>

          {/* Right: Accessibility Controls & Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Academic Support Hotline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
              <Phone size={13} color="#60A5FA" />
              <span>{t.hotline}</span>
            </div>

            <span style={{ color: '#475569' }}>|</span>

            {/* Accessibility Font Zoom Controls: A- | A | A+ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#94A3B8', fontSize: '0.74rem', userSelect: 'none' }}>{t.fontSize}:</span>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: 2,
                gap: 2,
              }}>
                <button
                  type="button"
                  onClick={decreaseFont}
                  disabled={fontScale <= 0.8}
                  aria-label="Decrease text size"
                  title="Smaller text size (A-)"
                  style={{
                    background: fontScale < 1.0 ? '#2563EB' : 'transparent',
                    border: 'none',
                    color: fontScale <= 0.8 ? '#475569' : '#FFFFFF',
                    padding: '3px 7px',
                    borderRadius: 4,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: fontScale <= 0.8 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  A-
                </button>

                <button
                  type="button"
                  onClick={resetFont}
                  aria-label="Reset text size to default"
                  title="Default text size 100% (A)"
                  style={{
                    background: fontScale === 1.0 ? '#2563EB' : 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  A
                </button>

                <button
                  type="button"
                  onClick={zoomFont}
                  disabled={fontScale >= 1.4}
                  aria-label="Increase text size"
                  title="Larger text size (A+)"
                  style={{
                    background: fontScale > 1.0 ? '#2563EB' : 'transparent',
                    border: 'none',
                    color: fontScale >= 1.4 ? '#475569' : '#FFFFFF',
                    padding: '3px 7px',
                    borderRadius: 4,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: fontScale >= 1.4 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  A+
                </button>
              </div>

              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: fontScale === 1.0 ? '#94A3B8' : '#60A5FA',
                  minWidth: 32,
                  textAlign: 'center',
                  userSelect: 'none',
                }}
              >
                {Math.round(fontScale * 100)}%
              </span>
            </div>

            {/* High Contrast Toggle */}
            <button
              type="button"
              onClick={toggleHighContrast}
              aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
              aria-pressed={highContrast}
              title="Toggle High Contrast Display"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: highContrast ? '#2563EB' : 'none',
                border: '1px solid #334155',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              <Eye size={12} />
              <span>{t.highContrast}</span>
            </button>

            <span style={{ color: '#475569' }}>|</span>

            {/* Multi-Lingual Language Dropdown */}
            <div ref={langMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={langMenuOpen}
                aria-label={`Select language. Current language is ${currentLangObj.label}`}
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                  padding: '3px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                <Globe size={13} color="#60A5FA" />
                <span>{currentLangObj.native}</span>
                <ChevronDown size={12} />
              </button>

              {langMenuOpen && (
                <div role="menu" aria-label="Language selection" style={{
                  position: 'absolute',
                  top: '100%',
                  right: isRTL ? 'auto' : 0,
                  left: isRTL ? 0 : 'auto',
                  marginTop: 6,
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 4,
                  minWidth: 150,
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 200,
                }}>
                  {languages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={language === l.code}
                      aria-label={`Switch language to ${l.label}`}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: language === l.code ? '#2563EB' : 'transparent',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: language === l.code ? 700 : 500,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      <span>{l.native}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tier */}
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        {/* Brand Logo & Title */}
        <button
          type="button"
          aria-label="Go to the home page"
          onClick={() => setCurrentPage('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Logo size={44} />
          <div>
            <div
              style={{
                color: '#0F172A',
                fontWeight: 800,
                fontSize: '1.45rem',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span>Edu</span>
              <span style={{
                color: 'var(--primary)',
                fontWeight: 800,
              }}>
                Sphere
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
              Unified Multi-Tenant Platform
            </div>
          </div>
        </button>

        {/* Desktop Navigation Links & Action Buttons */}
        <div className="desktop-nav" style={{ alignItems: 'center', gap: 28 }}>
          <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.92rem' }}>
            <button
              type="button"
              aria-current={currentPage === 'landing' ? 'page' : undefined}
              onClick={() => setCurrentPage('landing')}
              style={navItemClass(currentPage === 'landing')}
            >
              <Home size={15} />
              <span>{t.home}</span>
            </button>

            <button
              type="button"
              aria-current={currentPage === 'landing' ? 'page' : undefined}
              onClick={() => setCurrentPage('landing')}
              style={navItemClass(false)}
            >
              <BookOpen size={15} />
              <span>{t.courses}</span>
            </button>

            <button
              type="button"
              aria-current={currentPage === 'institution-register' ? 'page' : undefined}
              onClick={() => setCurrentPage('institution-register')}
              style={navItemClass(currentPage === 'institution-register')}
            >
              <Building2 size={15} />
              <span>{t.institutions}</span>
            </button>

            <button
              type="button"
              aria-current={currentPage === 'certificate-verify' ? 'page' : undefined}
              onClick={() => openVerification('')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: '0.88rem',
                fontWeight: 600,
                color: currentPage === 'certificate-verify' ? 'var(--primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                backgroundColor: currentPage === 'certificate-verify' ? 'var(--primary-light)' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheck size={16} color="var(--primary)" />
              <span>{t.verifyCertificate}</span>
            </button>
          </nav>

          {/* Authentication Action Zone: Prominent Sign In and Sign Up (ONLY Sign Up text) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* User Info Chip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-color)',
                  padding: '5px 12px',
                  borderRadius: 20
                }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A', lineHeight: 1.2 }}>
                      {currentUser.fullName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {currentUser.activeRole.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.activeRole === 'PLATFORM_ADMIN' || currentUser.activeRole === 'INSTITUTION_ADMIN') {
                      setCurrentPage('admin-dashboard');
                    } else if (currentUser.activeRole === 'INSTRUCTOR') {
                      setCurrentPage('teacher-studio');
                    } else {
                      setCurrentPage('learner-dashboard');
                    }
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700, borderRadius: 8 }}
                >
                  <LayoutDashboard size={15} />
                  <span>{t.myDashboard}</span>
                </button>

                <button
                  type="button"
                  onClick={logoutUser}
                  title={t.logout}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8 }}
                >
                  <LogOut size={15} />
                  <span>{t.logout}</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Sign In Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('login')}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <LogIn size={15} />
                  <span>{t.signIn}</span>
                </button>

                {/* Sign Up Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('register')}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <span>Sign Up</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-nav-toggle btn-ghost"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation-menu"
          style={{ padding: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          {mobileMenuOpen ? <X size={26} color="#0F172A" /> : <Menu size={26} color="#0F172A" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} id="mobile-navigation-menu" className="mobile-drawer" role="navigation" aria-label="Mobile navigation menu">
          <button
            type="button"
            onClick={() => { setCurrentPage('landing'); setMobileMenuOpen(false); }}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '14px 18px', fontSize: '1rem' }}
          >
            <Home size={18} />
            <span>{t.home}</span>
          </button>
          <button
            type="button"
            onClick={() => { setCurrentPage('landing'); setMobileMenuOpen(false); }}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '14px 18px', fontSize: '1rem' }}
          >
            <BookOpen size={18} />
            <span>{t.courses}</span>
          </button>
          <button
            type="button"
            onClick={() => { setCurrentPage('institution-register'); setMobileMenuOpen(false); }}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '14px 18px', fontSize: '1rem' }}
          >
            <Building2 size={18} />
            <span>{t.institutions}</span>
          </button>
          <button
            type="button"
            onClick={() => { openVerification(''); setMobileMenuOpen(false); }}
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '14px 18px', fontSize: '1rem' }}
          >
            <ShieldCheck size={18} color="var(--primary)" />
            <span>{t.verifyCertificate}</span>
          </button>

          <div style={{ height: 1, backgroundColor: 'var(--border-color)', margin: '8px 0' }} />

          {currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-main)', borderRadius: 8 }}>
                <div style={{ fontWeight: 800 }}>{currentUser.fullName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>{currentUser.activeRole}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentUser.activeRole === 'PLATFORM_ADMIN' || currentUser.activeRole === 'INSTITUTION_ADMIN') {
                    setCurrentPage('admin-dashboard');
                  } else if (currentUser.activeRole === 'INSTRUCTOR') {
                    setCurrentPage('teacher-studio');
                  } else {
                    setCurrentPage('learner-dashboard');
                  }
                  setMobileMenuOpen(false);
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px' }}
              >
                <LayoutDashboard size={18} />
                <span>{t.myDashboard}</span>
              </button>
              <button
                type="button"
                onClick={() => { logoutUser(); setMobileMenuOpen(false); }}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '14px' }}
              >
                <LogOut size={18} />
                <span>{t.logout}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                onClick={() => { setCurrentPage('login'); setMobileMenuOpen(false); }}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              >
                <LogIn size={18} />
                <span>{t.signIn}</span>
              </button>
              <button
                type="button"
                onClick={() => { setCurrentPage('register'); setMobileMenuOpen(false); }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              >
                <Sparkles size={18} />
                <span>Sign Up</span>
              </button>
            </div>
          )}

          <div style={{ height: 1, backgroundColor: 'var(--border-color)', margin: '12px 0 6px' }} />

          {/* Mobile Accessibility Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t.fontSize}:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'inline-flex', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8, padding: 2 }}>
                <button
                  type="button"
                  onClick={decreaseFont}
                  disabled={fontScale <= 0.8}
                  aria-label="Decrease text size"
                  style={{
                    background: fontScale < 1.0 ? 'var(--primary)' : 'transparent',
                    color: fontScale < 1.0 ? '#FFFFFF' : '#0F172A',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={resetFont}
                  aria-label="Reset text size to default"
                  style={{
                    background: fontScale === 1.0 ? 'var(--primary)' : 'transparent',
                    color: fontScale === 1.0 ? '#FFFFFF' : '#0F172A',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={zoomFont}
                  disabled={fontScale >= 1.4}
                  aria-label="Increase text size"
                  style={{
                    background: fontScale > 1.0 ? 'var(--primary)' : 'transparent',
                    color: fontScale > 1.0 ? '#FFFFFF' : '#0F172A',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  A+
                </button>
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>{Math.round(fontScale * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
