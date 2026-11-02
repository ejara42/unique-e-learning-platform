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
  Plus, 
  Trash2,
  Mail,
  MapPin,
  Phone
} from 'lucide-react';
import { Button, Badge, ToastViewport, useToast } from '../components/ui';

export const InstitutionRegisterPage: React.FC = () => {
  const { setCurrentPage } = useApp();
  const { toast, showToast, dismissToast } = useToast();

  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState('UNIVERSITY');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([
    'Ministry_Accreditation_Certificate.pdf'
  ]);
  const [customDocName, setCustomDocName] = useState('');

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

  const handleAddDocument = () => {
    if (!customDocName.trim()) {
      showToast({ title: 'Document title required', description: 'Add a document name before attaching it.', tone: 'warning' });
      return;
    }
    setUploadedFiles([...uploadedFiles, customDocName.trim()]);
    setCustomDocName('');
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
        documents: uploadedFiles.map(title => ({
          title,
          fileUrl: `https://docs.edusphere.io/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          uploadedAt: new Date().toISOString(),
        })),
      });

      setSuccessMsg(`Registration dossier for "${institutionName}" has been submitted to the National Accreditation Review Board. Platform administrators can now review and accept ("take") your institution into the system.`);
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
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                color: 'var(--primary)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 800,
              }}>
                <MinistryLogo size={16} />
                <span>Ministry Accreditation Onboarding</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Multi-Tenant Architecture</span>
            </div>

            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', marginBottom: 8 }}>
              Register Additional Institution
            </h1>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.96rem', lineHeight: 1.55 }}>
              Onboard a new university, K-12 school, college, or TVET academy. Applications are submitted to the Ministry / Platform Administration queue to be officially accepted and activated.
            </p>
          </div>

          {successMsg ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF' }}>
              <div style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                backgroundColor: 'var(--teal-50)',
                color: 'var(--teal-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                border: '2px solid var(--teal-200)',
              }}>
                <CheckCircle2 size={44} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 12 }}>
                Dossier Successfully Submitted
              </h2>
              <p style={{ color: 'var(--slate-600)', fontSize: '0.98rem', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
                {successMsg}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Button 
                  onClick={() => setCurrentPage('admin-dashboard')} 
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={18} />}
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
                  size="lg"
                >
                  Register Another Institution
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card" style={{ padding: 36 }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 24 }}>
                Institution Profile & Accreditation Dossier
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                    Institution Official Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                    <input 
                      type="text"
                      value={institutionName}
                      onChange={e => setInstitutionName(e.target.value)}
                      placeholder="e.g. Regional University or Academic Institution"
                      className="input-field"
                      style={{ paddingLeft: 42, height: 46 }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Institution Type
                    </label>
                    <select
                      value={institutionType}
                      onChange={e => setInstitutionType(e.target.value)}
                      className="input-field"
                      style={{ height: 46 }}
                    >
                      <option value="UNIVERSITY">University / Higher Education</option>
                      <option value="K12_SCHOOL">K-12 School Network</option>
                      <option value="TRAINING_CENTER">TVET / Technical Vocational</option>
                      <option value="INDEPENDENT_PROVIDER">Independent Academy</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Official Contact Email *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                      <input 
                        type="email"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="admissions@university.edu"
                        className="input-field"
                        style={{ paddingLeft: 42, height: 46 }}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Campus Physical Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                      <input 
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="e.g. Central University Avenue, Campus A"
                        className="input-field"
                        style={{ paddingLeft: 42, height: 46 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                      Telephone / Support Line
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                      <input 
                        type="text"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        placeholder="+251 11 123 4567"
                        className="input-field"
                        style={{ paddingLeft: 42, height: 46 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Document Attachments Section */}
                <div style={{
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--navy-950)', marginBottom: 6 }}>
                    Accreditation & Legal Authorization Documents
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: 16 }}>
                    Attach verifiable PDF copies of institutional operating permits and accreditation letters.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {uploadedFiles.map((doc, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                        fontSize: '0.88rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)', fontWeight: 700 }}>
                          <FileText size={18} />
                          <span>{doc}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--slate-400)',
                            cursor: 'pointer',
                          }}
                          title="Remove document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <input 
                      type="text"
                      value={customDocName}
                      onChange={e => setCustomDocName(e.target.value)}
                      placeholder="e.g. Higher_Education_Council_Permit.pdf"
                      className="input-field"
                      style={{ height: 40, fontSize: '0.88rem', flex: 1 }}
                    />
                    <Button 
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddDocument}
                      icon={<Plus size={16} />}
                    >
                      Attach File
                    </Button>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 12,
                  paddingTop: 20,
                  borderTop: '1px solid var(--border-color)',
                }}>
                  <Button 
                    type="button"
                    variant="secondary"
                    onClick={() => setCurrentPage('admin-dashboard')}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    variant="primary"
                    size="lg"
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
