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
  AlertCircle,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { Button, ToastViewport, useToast } from '../components/ui';

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
      <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          
          {/* Breadcrumb / Back Navigation */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setCurrentPage('landing')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#FFFFFF',
                color: 'var(--navy-900)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} /> Back to Catalog
            </button>
          </div>

          {/* Verification Portal Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'var(--slate-100)',
              border: '1px solid var(--border-color)',
              color: 'var(--navy-900)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.78rem',
              marginBottom: 12,
            }}>
              <ShieldCheck size={14} color="var(--primary)" />
              <span>Public Cryptographic Credential Ledger</span>
            </div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', margin: '0 0 8px' }}>
              Academic Diploma Verification
            </h1>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.92rem', maxWidth: 540, margin: '0 auto', lineHeight: 1.55 }}>
              Instant verification of authentic completion diplomas issued by accredited universities, schools, and technical institutes on EduSphere.
            </p>
          </div>

          {/* Search / QR code input form */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, maxWidth: 600, margin: '0 auto 36px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="var(--slate-400)" style={{ position: 'absolute', left: 14, top: 14 }} />
              <input 
                type="text" 
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Enter unique Certificate Code (e.g. EDU-2026-X89K-4921)"
                className="input-field"
                style={{ paddingLeft: 40, height: 44, fontSize: '0.9rem', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <Button 
              type="submit" 
              variant="primary" 
              size="md"
              isLoading={isLoading}
              style={{ height: 44, padding: '0 24px' }}
            >
              {isLoading ? 'Verifying...' : 'Verify Credential'}
            </Button>
          </form>

          {/* Verification Result Card */}
          {certData && isValid ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {/* Authenticated Banner */}
              <div style={{
                backgroundColor: '#F0FDF4',
                borderBottom: '1px solid #BBF7D0',
                padding: '14px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 700, fontSize: '0.88rem' }}>
                  <CheckCircle2 size={18} color="#166534" />
                  <span>Verified Official Credential • Cryptographically Authenticated</span>
                </div>
                <span style={{ fontSize: '0.76rem', color: '#166534', fontWeight: 700, fontFamily: 'monospace' }}>
                  STATUS: RECORD VALID & ACTIVE
                </span>
              </div>

              {/* Diploma Canvas Container */}
              <div style={{
                padding: '40px 32px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                margin: 20,
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                {/* Header Seals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MinistryLogo size={32} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--navy-950)' }}>MINISTRY OF EDUCATION</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--slate-500)' }}>National Higher Education Board</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Logo size={24} />
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--navy-950)' }}>EduSphere</span>
                  </div>
                </div>

                {/* Diploma Title */}
                <div style={{
                  fontSize: '0.8rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  fontWeight: 800,
                  marginBottom: 6,
                }}>
                  Certificate of Academic Achievement
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginBottom: 16 }}>
                  This is to officially certify that
                </div>

                {/* Scholar Name */}
                <h2 style={{
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  color: 'var(--navy-950)',
                  letterSpacing: '-0.02em',
                  marginBottom: 12,
                }}>
                  {certData.learnerName}
                </h2>

                <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.55 }}>
                  has successfully fulfilled all prescribed coursework, laboratory requirements, and proctored examinations for
                </p>

                {/* Course Title */}
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: 'var(--navy-950)',
                  marginBottom: 20,
                }}>
                  {certData.courseTitle}
                </div>

                {/* Verification Details Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 14,
                  padding: '14px 18px',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  marginBottom: 28,
                }}>
                  <div>
                    <div style={{ color: 'var(--slate-500)', fontSize: '0.72rem', fontWeight: 600 }}>ISSUING INSTITUTION</div>
                    <div style={{ fontWeight: 700, color: 'var(--navy-950)', marginTop: 2 }}>
                      {certData.institutionName || 'Institutional Partner'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--slate-500)', fontSize: '0.72rem', fontWeight: 600 }}>ISSUE DATE</div>
                    <div style={{ fontWeight: 700, color: 'var(--navy-950)', marginTop: 2 }}>
                      {new Date(certData.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--slate-500)', fontSize: '0.72rem', fontWeight: 600 }}>CREDENTIAL IDENTIFIER</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', marginTop: 2 }}>
                      {certData.certificateNumber}
                    </div>
                  </div>
                </div>

                {/* Signatures & QR */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                  gap: 16,
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.1rem', color: '#1E293B', fontWeight: 700 }}>Authorized Signatory</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', borderTop: '1px solid var(--slate-300)', paddingTop: 4, minWidth: 140 }}>
                      Academic Director
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      margin: '0 auto 4px',
                    }}>
                      <QrCode size={38} color="var(--navy-950)" />
                    </div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--slate-500)', fontFamily: 'monospace' }}>
                      SCAN TO VERIFY
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', color: '#1E293B', fontWeight: 700 }}>National Board</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', borderTop: '1px solid var(--slate-300)', paddingTop: 4, minWidth: 140 }}>
                      Accreditation Authority
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div style={{
                padding: '14px 24px',
                backgroundColor: 'var(--slate-50)',
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
                  icon={<Printer size={15} />}
                >
                  Print Diploma
                </Button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const link = `https://edusphere.io/verify/${certData?.certificateNumber || ''}`;
                      navigator.clipboard?.writeText(link).catch(() => {});
                      showToast({ title: 'Link copied', description: 'The credential verification link has been copied to the clipboard.', tone: 'success' });
                    }}
                    icon={<Share2 size={15} />}
                  >
                    Share Link
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      showToast({ title: 'Download started', description: 'Preparing verified PDF document.', tone: 'info' });
                      window.print();
                    }}
                    icon={<Download size={15} />}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          ) : hasSearched && !isLoading ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 24px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                border: '1px solid #FECACA',
              }}>
                <AlertCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
                Credential Verification Failed
              </h3>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem', maxWidth: 440, margin: '0 auto' }}>
                {statusMessage || 'The entered credential identifier could not be verified in the national cryptographic ledger.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
