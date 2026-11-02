import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICertificate } from '../types';
import { Logo } from '../components/Logo';
import { MinistryLogo } from '../components/MinistryLogo';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Search, 
  Download, 
  Printer, 
  Share2, 
  QrCode, 
  Building2, 
  Calendar, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';
import { Button, Badge, ToastViewport, useToast } from '../components/ui';

export const CertificateVerifyPage: React.FC = () => {
  const { verificationCode, setVerificationCode, setCurrentPage } = useApp();
  const { toast, showToast, dismissToast } = useToast();
  const [searchInput, setSearchInput] = useState(verificationCode || '');
  const [hasSearched, setHasSearched] = useState(Boolean(verificationCode));
  const [certData, setCertData] = useState<ICertificate | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchVerification = async (code: string) => {
    if (!code.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await api.verifyCertificate(code.trim());
      setIsValid(res.valid);
      setCertData(res.certificate || null);
      setStatusMessage(res.message);
    } catch (e: any) {
      setIsValid(false);
      setCertData(null);
      setStatusMessage('Invalid or unrecognized credential identifier.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (verificationCode) {
      fetchVerification(verificationCode);
    }
  }, [verificationCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVerification(searchInput);
  };

  return (
    <>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
      <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Verification Portal Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '6px 16px',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: '0.82rem',
            marginBottom: 16,
          }}>
            <ShieldCheck size={16} /> Official Public Verification Gateway
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.03em', marginBottom: 12 }}>
            Verify Certificate Authenticity
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Instant cryptographic validation for diplomas issued to learners by accredited institutions on EduSphere.
          </p>
        </div>

        {/* Search / QR code input form */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 40, maxWidth: 680, margin: '0 auto 40px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 16 }} />
            <input 
              type="text" 
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Enter unique Certificate Number (e.g. EDU-2026-X89K-4921)"
              className="input-field"
              style={{ paddingLeft: 46, height: 50, fontSize: '0.96rem', borderRadius: 'var(--radius-lg)' }}
            />
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            size="lg"
            isLoading={isLoading}
            style={{ height: 50, padding: '0 28px', borderRadius: 'var(--radius-lg)' }}
          >
            {isLoading ? 'Verifying...' : 'Verify Now'}
          </Button>
        </form>

        {/* Verification Result Card */}
        {certData && isValid ? (
          <div className="card" style={{
            padding: 0,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
            border: '2px solid #BFDBFE',
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-2xl)',
          }}>
            {/* Authenticated Banner */}
            <div style={{
              backgroundColor: '#ECFDF5',
              borderBottom: '1px solid #A7F3D0',
              padding: '16px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#047857', fontWeight: 800, fontSize: '0.94rem' }}>
                <CheckCircle2 size={22} color="#10B981" />
                <span>Verified Official Credential • Cryptographically Valid</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 600 }}>
                Status: ACTIVE IN LEDGER
              </span>
            </div>

            {/* Diploma Canvas Container */}
            <div style={{
              padding: '48px 40px',
              background: 'radial-gradient(circle at center, #FFFFFF 0%, #FAFAFA 100%)',
              border: '12px solid #F1F5F9',
              margin: 20,
              borderRadius: 'var(--radius-lg)',
              position: 'relative',
              textAlign: 'center',
            }}>
              {/* Header Seals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MinistryLogo size={36} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--navy-950)' }}>MINISTRY OF EDUCATION</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>National Higher Education Council</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Logo size={28} />
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy-950)' }}>EduSphere</span>
                </div>
              </div>

              {/* Diploma Title */}
              <div style={{
                fontSize: '0.88rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--primary)',
                fontWeight: 800,
                marginBottom: 8,
              }}>
                Certificate of Academic Achievement
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                This is to officially certify that
              </div>

              {/* Scholar Name */}
              <h2 style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: 'var(--navy-950)',
                letterSpacing: '-0.02em',
                marginBottom: 16,
                fontFamily: 'serif',
              }}>
                {certData.learnerName}
              </h2>

              <p style={{ fontSize: '0.94rem', color: 'var(--slate-600)', maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.6 }}>
                has successfully completed all prescribed coursework, laboratory requirements, and proctored examinations for
              </p>

              {/* Course Title */}
              <div style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--navy-950)',
                marginBottom: 24,
              }}>
                {certData.courseTitle}
              </div>

              {/* Verification Details Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                padding: '16px 20px',
                backgroundColor: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.82rem',
                textAlign: 'left',
                marginBottom: 32,
              }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>ISSUING INSTITUTION</div>
                  <div style={{ fontWeight: 800, color: 'var(--navy-950)' }}>
                    {certData.institutionName || 'Institution Partner'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>ISSUE DATE</div>
                  <div style={{ fontWeight: 800, color: 'var(--navy-950)' }}>
                    {new Date(certData.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>CREDENTIAL ID</div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {certData.certificateNumber}
                  </div>
                </div>
              </div>

              {/* Signatures & QR */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingTop: 16,
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: 20,
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'cursive', fontSize: '1.3rem', color: '#1E293B' }}>Authorized Signatory</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid #94A3B8', paddingTop: 4, minWidth: 160 }}>
                    Academic Director
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FFFFFF',
                    margin: '0 auto 4px',
                  }}>
                    <QrCode size={48} color="var(--navy-950)" />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    SCAN TO VERIFY
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'cursive', fontSize: '1.3rem', color: '#1E293B' }}>National Board</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid #94A3B8', paddingTop: 4, minWidth: 160 }}>
                    Accreditation Authority
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{
              padding: '16px 28px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                icon={<Printer size={16} />}
              >
                Print Diploma
              </Button>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const link = `https://edusphere.io/verify/${certData?.certificateNumber || ''}`;
                    navigator.clipboard?.writeText(link).catch(() => {});
                    showToast({ title: 'Link copied', description: 'The credential verification link has been copied to the clipboard.', tone: 'success' });
                  }}
                  icon={<Share2 size={16} />}
                >
                  Share Credential
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    showToast({ title: 'Download started', description: 'Preparing the verified PDF for export.', tone: 'info' });
                    window.print();
                  }}
                  icon={<Download size={16} />}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        ) : hasSearched && !isLoading ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertCircle size={36} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8 }}>
              Credential Verification Failed
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: 440, margin: '0 auto' }}>
              {statusMessage || 'The entered credential identifier could not be verified in the national cryptographic ledger.'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
};
