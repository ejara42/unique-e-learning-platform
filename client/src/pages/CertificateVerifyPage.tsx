import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICertificate } from '../types';
import { Logo } from '../components/Logo';
import { MinistryLogo } from '../components/MinistryLogo';
import {
  ShieldCheck,
  CheckCircle2,
  Search,
  Download,
  Printer,
  Share2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Button, ToastViewport, useToast } from '../components/ui';

/* ─── Shimmer Skeleton ──────────────────────────────────────────────────── */
const SkeletonLine: React.FC<{ width?: string; height?: number }> = ({
  width = '100%',
  height = 14,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: 6,
      background:
        'linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%)',
      backgroundSize: '200% 100%',
      animation: 'certShimmer 1.6s infinite',
    }}
  />
);

const CertificateSkeleton: React.FC = () => (
  <div
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
    }}
  >
    <div
      style={{
        height: 48,
        backgroundColor: '#F0FDF4',
        borderBottom: '1px solid #BBF7D0',
      }}
    />
    <div style={{ padding: '36px 32px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <SkeletonLine width="140px" height={18} />
        <SkeletonLine width="90px" height={18} />
      </div>
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <SkeletonLine width="220px" height={12} />
        <SkeletonLine width="280px" height={36} />
        <SkeletonLine width="360px" height={12} />
        <SkeletonLine width="240px" height={22} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 12,
            width: '100%',
            marginTop: 16,
          }}
        >
          <SkeletonLine height={48} />
          <SkeletonLine height={48} />
          <SkeletonLine height={48} />
        </div>
      </div>
    </div>
    <div
      style={{
        height: 56,
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
      }}
    />
  </div>
);

/* ─── QR image using public API ─────────────────────────────────────────── */
const QrImage: React.FC<{ data: string; size?: number }> = ({ data, size = 100 }) => {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=1E293B&bgcolor=FFFFFF`;
  return (
    <img
      src={src}
      alt="Scan to verify"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: 4 }}
      onError={e => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

/* ─── Main Component ────────────────────────────────────────────────────── */
export const CertificateVerifyPage: React.FC = () => {
  const { verificationCode, setVerificationCode, setCurrentPage } = useApp();
  const { toast, showToast, dismissToast } = useToast();
  const [searchInput, setSearchInput] = useState(verificationCode || '');
  const [hasSearched, setHasSearched] = useState(Boolean(verificationCode));
  const [certData, setCertData] = useState<ICertificate | null>(null);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const diplomaRef = useRef<HTMLDivElement>(null);

  const fetchVerification = async (code: string) => {
    if (!code.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setCertData(null);
    try {
      const res = await api.verifyCertificate(code.trim());
      setIsValid(res.valid);
      setCertData(res.certificate || null);
      setStatusMessage(res.message);
    } catch {
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

  const handlePrint = () => {
    showToast({ title: 'Opening print dialog…', description: 'Your diploma will print in high resolution.', tone: 'info' });
    window.print();
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/verify/${certData?.certificateNumber || searchInput}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'EduSphere Academic Credential', url: link });
      } else {
        await navigator.clipboard.writeText(link);
        showToast({ title: 'Link copied!', description: 'The credential verification link is in your clipboard.', tone: 'success' });
      }
    } catch {
      /* cancelled or denied */
    }
  };

  const handleReset = () => {
    setCertData(null);
    setHasSearched(false);
    setIsValid(true);
    setStatusMessage('');
    setSearchInput('');
    setVerificationCode?.('');
  };

  /* ── Print style injected via <style> so we don't need a CSS file edit ── */
  const printStyle = `
    @media print {
      body > *:not(#diploma-print-root) { display: none !important; }
      #diploma-print-root { display: block !important; position: static !important; }
      #diploma-print-frame { box-shadow: none !important; border: 1px solid #CBD5E1 !important; }
    }
  `;

  /* ── Issue date formatter ── */
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes certShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cert-result { animation: fadeInUp 0.4s ease both; }
        @media print {
          body > *:not(#diploma-print-root) { display: none !important; }
          #diploma-print-root { display: block !important; position: static !important; }
          #diploma-print-frame { box-shadow: none !important; border: 2px solid #CBD5E1 !important; }
        }
      `}</style>
      <style>{printStyle}</style>

      <ToastViewport toast={toast} onDismiss={dismissToast} />

      {/* ── Print-isolated wrapper ── */}
      <div id="diploma-print-root" style={{ display: 'contents' }}>

        <div
          style={{
            backgroundColor: 'var(--bg-main, #F8FAFC)',
            minHeight: '100vh',
            padding: '40px 24px 100px',
          }}
        >
          <div style={{ maxWidth: 860, margin: '0 auto' }}>

            {/* ── Back button ── */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setCurrentPage('landing')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#FFFFFF',
                  color: 'var(--navy-900, #1E293B)',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <ArrowLeft size={14} /> Back to Catalog
              </button>

              {certData && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.76rem',
                    color: '#059669',
                    fontWeight: 700,
                  }}
                >
                  <Lock size={12} /> SHA-256 Tamper-Evident
                </div>
              )}
            </div>

            {/* ── Page header ── */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  padding: '5px 14px',
                  borderRadius: 20,
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  letterSpacing: '0.04em',
                  marginBottom: 14,
                }}
              >
                <ShieldCheck size={13} color="#3B82F6" />
                <span>Public Cryptographic Credential Ledger</span>
              </div>

              <h1
                style={{
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  color: 'var(--navy-950, #0F172A)',
                  letterSpacing: '-0.028em',
                  margin: '0 0 10px',
                  lineHeight: 1.15,
                }}
              >
                Academic Diploma Verification
              </h1>
              <p
                style={{
                  color: '#64748B',
                  fontSize: '0.92rem',
                  maxWidth: 560,
                  margin: '0 auto',
                  lineHeight: 1.6,
                }}
              >
                Employers, ministries, and universities can verify authentic completion diplomas issued
                by accredited EduSphere institutions without login credentials.
              </p>
            </div>

            {/* ── Search form ── */}
            <form
              onSubmit={handleSearch}
              style={{ display: 'flex', gap: 10, maxWidth: 620, margin: '0 auto 40px' }}
            >
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={16}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Enter unique Certificate Code (e.g. EDU-XXXX-XXXX-XXXX)"
                  className="input-field"
                  style={{
                    paddingLeft: 42,
                    height: 48,
                    fontSize: '0.92rem',
                    borderRadius: 10,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                style={{ height: 48, padding: '0 28px', borderRadius: 10, fontWeight: 700 }}
              >
                {isLoading ? 'Verifying…' : 'Verify Credential'}
              </Button>
            </form>

            {/* ── Loading skeleton ── */}
            {isLoading && <CertificateSkeleton />}

            {/* ── Valid certificate ── */}
            {!isLoading && certData && isValid && (
              <div
                className="cert-result"
                id="diploma-print-frame"
                ref={diplomaRef}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 8px 40px rgba(15,23,42,0.1)',
                }}
              >
                {/* Authenticated banner */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderBottom: '1px solid #BBF7D0',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#166534',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                    }}
                  >
                    <CheckCircle2 size={17} color="#16A34A" />
                    Verified Official Credential • Cryptographically Authenticated
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#166534',
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '0.04em',
                    }}
                  >
                    STATUS: RECORD VALID &amp; ACTIVE
                  </span>
                </div>

                {/* ── Diploma canvas ── */}
                <div
                  style={{
                    padding: '44px 40px 36px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Watermark */}
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      zIndex: 0,
                      opacity: 0.028,
                    }}
                  >
                    <ShieldCheck size={340} color="#1E3A5F" strokeWidth={0.6} />
                  </div>

                  {/* Decorative corner borders */}
                  {(['topleft','topright','bottomleft','bottomright'] as const).map(pos => (
                    <div
                      key={pos}
                      aria-hidden
                      style={{
                        position: 'absolute',
                        width: 36,
                        height: 36,
                        ...(pos.includes('top') ? { top: 20 } : { bottom: 20 }),
                        ...(pos.includes('left') ? { left: 20 } : { right: 20 }),
                        borderTop: pos.includes('top') ? '2.5px solid #BFDBFE' : 'none',
                        borderBottom: pos.includes('bottom') ? '2.5px solid #BFDBFE' : 'none',
                        borderLeft: pos.includes('left') ? '2.5px solid #BFDBFE' : 'none',
                        borderRight: pos.includes('right') ? '2.5px solid #BFDBFE' : 'none',
                        borderRadius: pos === 'topleft' ? '4px 0 0 0' : pos === 'topright' ? '0 4px 0 0' : pos === 'bottomleft' ? '0 0 0 4px' : '0 0 4px 0',
                      }}
                    />
                  ))}

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Header: seals row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 32,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MinistryLogo size={34} />
                        <div>
                          <div
                            style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.06em' }}
                          >
                            MINISTRY OF EDUCATION
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B' }}>
                            National Higher Education Board
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Logo size={26} />
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                          EduSphere
                        </span>
                      </div>
                    </div>

                    {/* Title row */}
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: '#3B82F6',
                          fontWeight: 800,
                          marginBottom: 6,
                        }}
                      >
                        Certificate of Academic Achievement
                      </div>
                      <div
                        style={{
                          fontSize: '0.84rem',
                          color: '#64748B',
                          marginBottom: 14,
                          fontStyle: 'italic',
                        }}
                      >
                        This is to officially certify that
                      </div>

                      {/* Scholar name */}
                      <h2
                        style={{
                          fontSize: '2.4rem',
                          fontWeight: 800,
                          color: '#0F172A',
                          letterSpacing: '-0.025em',
                          lineHeight: 1.1,
                          margin: '0 0 10px',
                          fontFamily: 'Georgia, serif',
                        }}
                      >
                        {certData.learnerName || (certData as any).studentName}
                      </h2>

                      <p
                        style={{
                          fontSize: '0.88rem',
                          color: '#64748B',
                          maxWidth: 500,
                          margin: '0 auto 16px',
                          lineHeight: 1.6,
                        }}
                      >
                        has successfully fulfilled all prescribed coursework, laboratory requirements,
                        and proctored examinations for
                      </p>

                      {/* Course title */}
                      <div
                        style={{
                          fontSize: '1.35rem',
                          fontWeight: 800,
                          color: '#1E293B',
                          marginBottom: 4,
                        }}
                      >
                        {certData.courseTitle}
                      </div>
                    </div>

                    {/* Metadata grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 12,
                        padding: '14px 18px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                        fontSize: '0.8rem',
                        marginBottom: 32,
                      }}
                    >
                      {[
                        { label: 'ISSUING INSTITUTION', value: certData.institutionName || 'Institutional Partner' },
                        { label: 'ISSUE DATE', value: fmtDate(certData.issueDate) },
                        {
                          label: 'CREDENTIAL ID',
                          value: certData.certificateNumber,
                          mono: true,
                          primary: true,
                        },
                      ].map(item => (
                        <div key={item.label}>
                          <div
                            style={{
                              color: '#94A3B8',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              marginBottom: 3,
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: item.primary ? '#3B82F6' : '#0F172A',
                              fontFamily: item.mono ? 'JetBrains Mono, monospace' : 'inherit',
                              fontSize: item.mono ? '0.78rem' : '0.84rem',
                              wordBreak: 'break-all',
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Signatures + QR row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        paddingTop: 20,
                        borderTop: '1px solid #E2E8F0',
                        flexWrap: 'wrap',
                        gap: 20,
                      }}
                    >
                      {/* Signatory 1 */}
                      <div style={{ textAlign: 'left' }}>
                        <div
                          style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: '1.05rem',
                            color: '#1E293B',
                            fontWeight: 700,
                            fontStyle: 'italic',
                            marginBottom: 6,
                          }}
                        >
                          Authorized Signatory
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: '#94A3B8',
                            borderTop: '1px solid #CBD5E1',
                            paddingTop: 4,
                            minWidth: 150,
                          }}
                        >
                          Academic Director, EduSphere
                        </div>
                      </div>

                      {/* QR code */}
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 8,
                            padding: 6,
                            display: 'inline-block',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          {certData.qrCodeData ? (
                            <QrImage data={certData.qrCodeData} size={96} />
                          ) : (
                            <div
                              style={{
                                width: 96,
                                height: 96,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#F1F5F9',
                                borderRadius: 4,
                              }}
                            >
                              <ShieldCheck size={36} color="#CBD5E1" />
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '0.62rem',
                            color: '#94A3B8',
                            fontFamily: 'JetBrains Mono, monospace',
                            marginTop: 5,
                            letterSpacing: '0.06em',
                          }}
                        >
                          SCAN TO VERIFY
                        </div>
                      </div>

                      {/* Signatory 2 */}
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: '1.05rem',
                            color: '#1E293B',
                            fontWeight: 700,
                            fontStyle: 'italic',
                            marginBottom: 6,
                          }}
                        >
                          National Board
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: '#94A3B8',
                            borderTop: '1px solid #CBD5E1',
                            paddingTop: 4,
                            minWidth: 150,
                          }}
                        >
                          Accreditation Authority
                        </div>
                      </div>
                    </div>

                    {/* SHA-256 hash strip */}
                    {(certData as any).hashStamp && (
                      <div
                        style={{
                          marginTop: 20,
                          padding: '8px 14px',
                          backgroundColor: '#F1F5F9',
                          borderRadius: 8,
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Lock size={12} color="#64748B" />
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: '#64748B',
                            fontFamily: 'JetBrains Mono, monospace',
                            wordBreak: 'break-all',
                          }}
                        >
                          SHA-256: {(certData as any).hashStamp}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Actions bar ── */}
                <div
                  style={{
                    padding: '14px 24px',
                    backgroundColor: '#F8FAFC',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrint}
                    icon={<Printer size={14} />}
                  >
                    Print Diploma
                  </Button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleShare}
                      icon={<Share2 size={14} />}
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
                      icon={<Download size={14} />}
                    >
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Not found state ── */}
            {!isLoading && hasSearched && !certData && (
              <div
                className="cert-result"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FEE2E2',
                  borderRadius: 16,
                  padding: '52px 32px',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(239,68,68,0.06)',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                >
                  <AlertCircle size={30} color="#EF4444" />
                </div>

                <h3
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    marginBottom: 8,
                  }}
                >
                  Credential Verification Failed
                </h3>

                <p
                  style={{
                    color: '#64748B',
                    fontSize: '0.9rem',
                    maxWidth: 480,
                    margin: '0 auto 28px',
                    lineHeight: 1.6,
                  }}
                >
                  {statusMessage ||
                    'The entered credential identifier could not be verified in the national cryptographic ledger. Ensure the code is entered exactly as printed on the diploma.'}
                </p>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReset}
                    icon={<RefreshCw size={14} />}
                  >
                    Try Another Code
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage('landing')}
                    icon={<ExternalLink size={14} />}
                  >
                    Back to Platform
                  </Button>
                </div>
              </div>
            )}

            {/* ── Trust footer ── */}
            <div
              style={{
                marginTop: 48,
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 20,
              }}
            >
              {[
                { icon: <ShieldCheck size={13} />, text: 'Cryptographically signed with SHA-256' },
                { icon: <Lock size={13} />, text: 'Zero private data exposed' },
                { icon: <CheckCircle2 size={13} />, text: 'WCAG 2.1 AA Compliant' },
              ].map(item => (
                <div
                  key={item.text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.76rem',
                    color: '#94A3B8',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: '#CBD5E1' }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
