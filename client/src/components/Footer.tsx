import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';
import { ShieldCheck, ArrowUp } from 'lucide-react';
import { Modal, Button } from './ui';

export const Footer: React.FC = () => {
  const { openVerification, t } = useApp();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="app-footer" role="contentinfo">
        <div className="app-footer-container">
          {/* Brand & Dynamic Copyright */}
          <div className="app-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Logo size={22} />
              <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.96rem', letterSpacing: '-0.02em' }}>
                Edu<span style={{ color: 'var(--primary-hover)' }}>Sphere</span>
              </span>
            </div>
            <span style={{ color: 'var(--slate-600)', fontSize: '0.8rem' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>
              © {currentYear} EduSphere. All rights reserved.
            </span>
          </div>

          {/* Essential Verified Actions & Legal Modals */}
          <nav className="app-footer-links" aria-label="Footer Navigation">
            {/* Direct Link to Official Verification Gateway */}
            <button
              type="button"
              onClick={() => openVerification('')}
              className="app-footer-link"
              title="Verify academic certificate authenticity"
            >
              <ShieldCheck size={14} color="var(--teal-400)" />
              <span>{t.verifyCertificate}</span>
            </button>

            {/* Privacy Policy Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="app-footer-link"
            >
              {t.footerPrivacy}
            </button>

            {/* Terms of Service Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="app-footer-link"
            >
              {t.footerTerms}
            </button>

            {/* Accessible Back to Top Action */}
            <button
              type="button"
              onClick={scrollToTop}
              className="app-footer-scroll-top"
              title="Return to the top of the page"
              aria-label="Scroll back to top"
            >
              <span>Back to Top</span>
              <ArrowUp size={12} />
            </button>
          </nav>
        </div>
      </footer>

      {/* Verified Privacy Policy Dialog */}
      <Modal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        title="Data Privacy & Confidentiality Policy"
        maxWidth={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.9rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>
          <p>
            EduSphere is dedicated to upholding the highest standards of data security, student record confidentiality, and multi-tenant organizational privacy.
          </p>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, fontSize: '0.92rem' }}>
              1. Institutional Tenant Isolation
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', margin: 0 }}>
              All courseware, scholar submissions, and academic grades are strictly isolated at the database level using scoped multi-tenant barriers. Institutions maintain full administrative ownership of their records.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, fontSize: '0.92rem' }}>
              2. Assessment Telemetry & Anti-Cheating
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', margin: 0 }}>
              Proctoring flags and window-focus events recorded during examinations are securely encrypted and accessible solely by verified institution faculty directors for academic integrity evaluations.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, fontSize: '0.92rem' }}>
              3. Verifiable Digital Credentials
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', margin: 0 }}>
              Issued digital diplomas incorporate cryptographic SHA-256 hashes for authenticity verification. Public verification lookups confirm credential validity without exposing private scholar profile records.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" size="md" onClick={() => setIsPrivacyOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Verified Terms of Academic Service Dialog */}
      <Modal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        title="Terms of Academic Service"
        maxWidth={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.9rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>
          <p>
            By accessing the EduSphere e-learning platform, participating learners, instructors, and partner institutions agree to the following operational terms:
          </p>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, fontSize: '0.92rem' }}>
              1. Academic Honesty & Code of Conduct
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', margin: 0 }}>
              Scholars agree to complete proctored exams independently. Unauthorized collaboration, window switching during anti-cheating sessions, or plagiarism may result in grade revocation.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, fontSize: '0.92rem' }}>
              2. Course Access & Certification
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', margin: 0 }}>
              Official verifiable diplomas are granted exclusively upon meeting or exceeding the minimum passing percentage specified in the accredited syllabus.
            </p>
          </div>
          <div style={{ backgroundColor: 'var(--slate-50)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, fontSize: '0.92rem' }}>
              3. Platform Governance
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--slate-600)', margin: 0 }}>
              Platform Superadministrators and accredited institution directors reserve the right to review accreditation dossiers and audit activity trails to protect platform integrity.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" size="md" onClick={() => setIsTermsOpen(false)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
