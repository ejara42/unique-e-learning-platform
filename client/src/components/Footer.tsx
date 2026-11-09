import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Logo } from './Logo';
import { 
  ShieldCheck, 
  ArrowUp, 
  HelpCircle, 
  Info, 
  Send, 
  CheckCircle2, 
  Lock, 
  Check,
  FileText
} from 'lucide-react';
import { Modal, Button } from './ui';

export const Footer: React.FC = () => {
  const { openVerification, t, setCurrentPage } = useApp();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Support Ticket Form State (WEB-02, ADM-04)
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'GENERAL' | 'TECHNICAL' | 'ACADEMIC' | 'BILLING' | 'ACCREDITATION'>('GENERAL');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName.trim() || !ticketEmail.trim() || !ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmittingTicket(true);
    setTicketSuccess(null);
    try {
      const res = await api.submitSupportTicket({
        fullName: ticketName.trim(),
        email: ticketEmail.trim(),
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });
      setTicketSuccess(res.message || 'Ticket submitted successfully. Our operations desk will respond shortly.');
      setTicketSubject('');
      setTicketMessage('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit support ticket');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="app-footer" role="contentinfo">
        <div className="app-footer-status">
          <div className="app-footer-status-inner">
            <div className="app-footer-status-group">
              <span className="app-footer-status-dot" />
              <span className="app-footer-status-text">All Platform Systems Operational</span>
              <span className="app-footer-status-divider">•</span>
              <span>Cloudflare Edge + LiveKit WebRTC Active</span>
            </div>

            <div className="app-footer-status-group app-footer-status-meta">
              <span className="app-footer-status-inline">
                <Lock size={12} color="#10B981" />
                <span>SHA-256 Tamper-Evident Ledger</span>
              </span>
              <span className="app-footer-status-divider">•</span>
              <span>WCAG 2.1 AA Compliant</span>
            </div>
          </div>
        </div>

        <div className="app-footer-main">
          <div className="app-footer-grid">
            <div className="app-footer-column app-footer-brand-column">
              <div className="app-footer-brand-row">
                <Logo size={24} />
                <span className="app-footer-brand-text">
                  Edu<span>Sphere</span>
                </span>
              </div>

              <p className="app-footer-microcopy">
                The unified national learning infrastructure bridging schools, universities, vocational training colleges, and independent scholars with verified digital credentials and low-latency virtual classrooms.
              </p>

              <div className="app-footer-badge">
                <ShieldCheck size={14} color="#38BDF8" />
                <span>National Accreditation Standard v2.4</span>
              </div>
            </div>

            <div className="app-footer-column">
              <h4 className="app-footer-heading">Academic Ecosystem</h4>
              <ul className="app-footer-list">
                <li><button type="button" className="app-footer-link" onClick={() => setCurrentPage('landing')}>Primary Education</button></li>
                <li><button type="button" className="app-footer-link" onClick={() => setCurrentPage('landing')}>Secondary & High School</button></li>
                <li><button type="button" className="app-footer-link" onClick={() => setCurrentPage('landing')}>TVET & Skills</button></li>
                <li><button type="button" className="app-footer-link" onClick={() => setCurrentPage('landing')}>University Programs</button></li>
                <li><button type="button" className="app-footer-link" onClick={() => setCurrentPage('institution-register')}>Institutional Accreditation</button></li>
              </ul>
            </div>

            <div className="app-footer-column">
              <h4 className="app-footer-heading">Platform Standards</h4>
              <ul className="app-footer-list app-footer-checklist">
                <li><Check size={14} color="#10B981" /><span>Tenant Isolation Architecture</span></li>
                <li><Check size={14} color="#10B981" /><span>Cryptographic SHA-256 Ledger</span></li>
                <li><Check size={14} color="#10B981" /><span>Proctored Integrity Telemetry</span></li>
                <li><Check size={14} color="#10B981" /><span>Real-time LiveKit WebRTC</span></li>
                <li><Check size={14} color="#10B981" /><span>Role-Based Access Control</span></li>
              </ul>
            </div>

            <div className="app-footer-column">
              <h4 className="app-footer-heading">Trust & Assistance</h4>
              <ul className="app-footer-list">
                <li>
                  <button type="button" className="app-footer-link app-footer-link-primary" onClick={() => openVerification('')}>
                    <ShieldCheck size={14} />
                    <span>{t.verifyCertificate}</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="app-footer-link" onClick={() => setIsAboutOpen(true)}>
                    <Info size={14} />
                    <span>About EduSphere</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="app-footer-link" onClick={() => setIsHelpOpen(true)}>
                    <HelpCircle size={14} />
                    <span>Help Desk & FAQ</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="app-footer-link" onClick={() => setIsPrivacyOpen(true)}>
                    <FileText size={14} />
                    <span>{t.footerPrivacy}</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="app-footer-link" onClick={() => setIsTermsOpen(true)}>
                    <FileText size={14} />
                    <span>{t.footerTerms}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="app-footer-bottom">
            <div className="app-footer-copy">
              © {currentYear} EduSphere Unified E-Learning Platform. Built for sovereign multi-tenant education.
            </div>

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
          </div>
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

      {/* About EduSphere Information Modal (WEB-02) */}
      <Modal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        title="About EduSphere Unified E-Learning Platform"
        maxWidth={640}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.9rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>
          <p>
            <strong>EduSphere</strong> is a unified, national-grade web-based learning management ecosystem engineered to bridge government schools, private academies, universities, vocational training centers, and independent learners across Ethiopia and beyond.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div style={{ backgroundColor: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h5 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>Multi-Tenant Architecture</h5>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Strict database-level isolation guarantees institutional autonomy, brand customization, and localized student management.</p>
            </div>
            <div style={{ backgroundColor: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h5 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>Cryptographic Credentials</h5>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Diplomas and completion certificates are stamped with unique SHA-256 verification codes accessible publicly without authentication.</p>
            </div>
            <div style={{ backgroundColor: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h5 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>WebRTC Live Classrooms</h5>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>High-definition, low-latency live interactive lecture stages powered by modern WebRTC cloud infrastructure.</p>
            </div>
            <div style={{ backgroundColor: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h5 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>Tri-Lingual Accessibility</h5>
              <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Fully localized in English, Amharic, and Afaan Oromoo with WCAG AA compliance, font scaling, and high-contrast modes.</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" size="md" onClick={() => setIsAboutOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Help, Support & FAQ Dialog (WEB-02, ADM-04) */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Help Center, FAQs & Academic Support"
        maxWidth={680}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}>
          {/* FAQ Accordion */}
          <div>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 12, fontSize: '1rem' }}>
              Frequently Asked Questions (FAQ)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy-950)', fontSize: '0.88rem' }}>How do I enroll in public or institutional courses?</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginTop: 4 }}>
                  Browse our course catalog. Free courses enroll instantly. Paid courses require credit or debit processing via Stripe. Institutional restricted courses verify your student affiliation.
                </div>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy-950)', fontSize: '0.88rem' }}>How do employers verify my certificate?</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginTop: 4 }}>
                  Each certificate issued displays a unique credential code (e.g., EDU-XXXX-XXXX-XXXX). Anyone can enter this code at the public Verification Portal to verify issuer, date, and passing grade without needing an account.
                </div>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy-950)', fontSize: '0.88rem' }}>How does anti-cheating proctoring work during exams?</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginTop: 4 }}>
                  During timed assessments, the platform monitors window focus and tab switching. Any unauthorized tab changes or window blurs generate proctoring telemetry logged directly in the instructor grading dossier.
                </div>
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy-950)', fontSize: '0.88rem' }}>How can my educational institution apply for onboarding?</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginTop: 4 }}>
                  Authorized school and university deans can visit the "Institutions" portal, upload official Ministry accreditation permits, and submit their dossier for Platform Administrator approval.
                </div>
              </div>
            </div>
          </div>

          {/* Contact Support Form (ADM-04) */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            <h4 style={{ fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8, fontSize: '1rem' }}>
              Submit an Inquiry to the Academic Help Desk
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: 14 }}>
              Need technical assistance, billing help, or course support? Our regional operations team responds within 24 business hours.
            </p>

            {ticketSuccess && (
              <div style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86rem' }}>
                <CheckCircle2 size={16} />
                <span>{ticketSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={ticketName}
                    onChange={e => setTicketName(e.target.value)}
                    placeholder="Abebe Bikila"
                    className="input-field"
                    style={{ height: 38, fontSize: '0.86rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={ticketEmail}
                    onChange={e => setTicketEmail(e.target.value)}
                    placeholder="you@institution.edu"
                    className="input-field"
                    style={{ height: 38, fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Category</label>
                  <select
                    value={ticketCategory}
                    onChange={e => setTicketCategory(e.target.value as any)}
                    className="input-field"
                    style={{ height: 38, fontSize: '0.86rem' }}
                  >
                    <option value="GENERAL">General Inquiries</option>
                    <option value="TECHNICAL">Technical / Live Classroom</option>
                    <option value="ACADEMIC">Curriculum & Exams</option>
                    <option value="BILLING">Tuition & Payments</option>
                    <option value="ACCREDITATION">Institution Accreditation</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Subject</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    placeholder="e.g. Issue connecting webcam in live session"
                    className="input-field"
                    style={{ height: 38, fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Message Details</label>
                <textarea
                  required
                  rows={3}
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  placeholder="Describe your question or issue in detail..."
                  className="input-field"
                  style={{ fontSize: '0.86rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <Button variant="secondary" size="md" type="button" onClick={() => setIsHelpOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" disabled={isSubmittingTicket} icon={<Send size={14} />}>
                  {isSubmittingTicket ? 'Submitting...' : 'Send Inquiry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
};
