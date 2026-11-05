import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sidebar } from '../components/Sidebar';
import { MinistryLogo } from '../components/MinistryLogo';
import {
  Building2,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  FileText,
  ArrowRight,
  Trash2,
  Mail,
  MapPin,
  Phone
} from 'lucide-react';
import { Button, ToastViewport, useToast } from '../components/ui';

export const InstitutionRegisterPage: React.FC = () => {
  const { setCurrentPage } = useApp();
  const { toast, showToast, dismissToast } = useToast();

  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState('UNIVERSITY');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [uploadedFiles, setUploadedFiles] = useState<Array<{ title: string; fileUrl: string; uploadedAt: string }>>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const validateForm = () => {
    if (!institutionName.trim()) {
      return 'Please provide the official institution name.';
    }
    if (!contactEmail.trim()) {
      return 'Please provide the official contact email.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return 'Please enter a valid institutional email address.';
    }
    return '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const uploadRes = await api.uploadFile(file, 'VERIFICATION_DOC', true);
      setUploadedFiles(prev => [
        ...prev,
        {
          title: file.name,
          fileUrl: uploadRes.fileUrl,
          uploadedAt: new Date().toISOString(),
        }
      ]);
      showToast({ title: 'Document uploaded', description: `Uploaded "${file.name}" to verified cloud repository.`, tone: 'success' });
    } catch (err: any) {
      showToast({ title: 'Upload failed', description: err.message || 'File upload failed', tone: 'error' });
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      showToast({ title: 'Validation error', description: validationError, tone: 'error' });
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.registerTenant({
        institutionName: institutionName.trim(),
        institutionType,
        address: address.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        documents: uploadedFiles,
      });

      setSuccessMsg(`Registration dossier for "${institutionName}" has been submitted to the National Accreditation Review Board. Platform administrators can now review and approve your institution.`);
      showToast({ title: 'Application submitted', description: 'Your accreditation dossier is in the approval queue.', tone: 'success' });
    } catch (err: any) {
      showToast({ title: 'Submission failed', description: err.message || 'Registration failed', tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />
      <ToastViewport toast={toast} onDismiss={dismissToast} />

      <main className="dashboard-main">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'var(--slate-100)',
                border: '1px solid var(--border-color)',
                color: 'var(--navy-900)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}>
                <MinistryLogo size={14} />
                <span>Ministry Accreditation Onboarding</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Multi-Tenant Architecture</span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', margin: '0 0 6px' }}>
              Register Institutional Tenant
            </h1>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
              Onboard a university, K-12 school, college, or TVET academy. Applications are submitted to the platform governance queue for official verification.
            </p>
          </div>

          {successMsg ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#F0FDF4',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                border: '1px solid #BBF7D0',
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8 }}>
                Dossier Successfully Submitted
              </h2>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>
                {successMsg}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Button
                  onClick={() => setCurrentPage('admin-dashboard')}
                  variant="primary"
                  size="md"
                  icon={<ArrowRight size={15} />}
                >
                  Go to Institution Approval Queue
                </Button>
                <Button
                  onClick={() => {
                    setSuccessMsg('');
                    setInstitutionName('');
                    setContactEmail('');
                    setAddress('');
                    setContactPhone('');
                  }}
                  variant="secondary"
                  size="md"
                >
                  Register Another Institution
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 20 }}>
                Institution Profile & Accreditation Dossier
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Institution Official Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={16} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 13 }} />
                    <input
                      type="text"
                      value={institutionName}
                      onChange={e => setInstitutionName(e.target.value)}
                      placeholder="e.g. National Institute of Technology or Regional University"
                      className="input-field"
                      style={{ paddingLeft: 38, height: 42, fontSize: '0.88rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Institution Type
                    </label>
                    <select
                      value={institutionType}
                      onChange={e => setInstitutionType(e.target.value)}
                      className="input-field"
                      style={{ height: 42, fontSize: '0.88rem' }}
                    >
                      <option value="UNIVERSITY">University / Higher Education</option>
                      <option value="K12_SCHOOL">K-12 School Network</option>
                      <option value="TRAINING_CENTER">TVET / Technical Vocational</option>
                      <option value="INDEPENDENT_PROVIDER">Independent Academy</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Official Contact Email *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 13 }} />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="admissions@university.edu"
                        className="input-field"
                        style={{ paddingLeft: 38, height: 42, fontSize: '0.88rem' }}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Campus Physical Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 13 }} />
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="e.g. Central University Avenue, Campus A"
                        className="input-field"
                        style={{ paddingLeft: 38, height: 42, fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Telephone / Contact Line
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 13 }} />
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        placeholder="+251 11 123 4567"
                        className="input-field"
                        style={{ paddingLeft: 38, height: 42, fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Document Attachments Section */}
                <div style={{
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy-950)', marginBottom: 4 }}>
                    Accreditation & Operating License Documents
                  </div>
                  <p style={{ color: 'var(--slate-500)', fontSize: '0.82rem', marginBottom: 14 }}>
                    Attach official PDF copies of institutional operating permits and accreditation letters.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {uploadedFiles.length === 0 ? (
                      <div style={{ padding: '14px', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.82rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        No accreditation documents attached yet. Click below to select PDF files from your device.
                      </div>
                    ) : (
                      uploadedFiles.map((doc, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.84rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--navy-900)', fontWeight: 600 }}>
                            <FileText size={15} color="var(--primary)" />
                            <span>{doc.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--slate-400)',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                            title="Remove document"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: uploadingDoc ? 'not-allowed' : 'pointer',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary)',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}>
                      <UploadCloud size={15} />
                      <span>{uploadingDoc ? 'Uploading...' : 'Upload Accreditation PDF / Doc'}</span>
                      <input
                        type="file"
                        accept="application/pdf,image/*,.doc,.docx"
                        style={{ display: 'none' }}
                        disabled={uploadingDoc}
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 6,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setCurrentPage('admin-dashboard')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting Dossier...' : 'Submit Application Dossier'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
