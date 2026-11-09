import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Sidebar } from '../components/Sidebar';
import { MinistryLogo } from '../components/MinistryLogo';
import { ITenant, IAuditLog } from '../types';
import {
  Building2,
  Users,
  BookOpen,
  Activity,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  FileText,
  UserCheck,
  Eye,
  Search,
  Check,
  X,
  Clock,
  Lock,
  ExternalLink
} from 'lucide-react';
import { Button, Badge, Modal, EmptyState, ToastViewport, useToast } from '../components/ui';

export const AdminDashboard: React.FC = () => {
  const { currentUser, setCurrentPage } = useApp();
  const { toast, showToast, dismissToast } = useToast();
  const [tenants, setTenants] = useState<ITenant[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [activities, setActivities] = useState<IAuditLog[]>([]);
  const [metrics, setMetrics] = useState({
    totalInstitutions: 0,
    pendingInstitutions: 0,
    verifiedInstitutions: 0,
    totalUsers: 0,
    totalCourses: 0,
    activeLearners: 0,
  });

  // Active Tab: 'institutions' | 'admissions' | 'audit'
  const [activeTab, setActiveTab] = useState<'institutions' | 'admissions' | 'audit'>('institutions');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedTenantDossier, setSelectedTenantDossier] = useState<ITenant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Institution Form State
  const [newInstName, setNewInstName] = useState('');
  const [newInstType, setNewInstType] = useState('UNIVERSITY');
  const [newInstEmail, setNewInstEmail] = useState('');
  const [newInstAddress, setNewInstAddress] = useState('');
  const [newInstAutoAccept, setNewInstAutoAccept] = useState(true);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const loadData = () => {
    setIsLoadingData(true);
    api.getAdminMetrics()
      .then(res => {
        setMetrics(res.metrics as any);
        setTenants(res.allInstitutions || res.recentInstitutions || []);
        setActivities(res.recentActivities || []);
      })
      .catch(() => {
        api.getTenants().then(res => setTenants(res.tenants));
      })
      .finally(() => {
        setIsLoadingData(false);
      });

    api.getAdmissions()
      .then(res => setAdmissions(res.admissions || []))
      .catch(() => { });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Platform Admin Accepts / Takes or Rejects an Institution
  const handleUpdateTenantStatus = async (tenantId: string, status: 'VERIFIED' | 'REJECTED', tenantName: string) => {
    try {
      await api.updateTenantStatus(
        tenantId,
        status,
        status === 'VERIFIED' ? 'Accreditation dossier approved by Platform Superadmin' : 'Accreditation declined'
      );
      showToast({
        title: status === 'VERIFIED' ? 'Institution accepted' : 'Institution rejected',
        description: status === 'VERIFIED'
          ? `Institution "${tenantName}" officially accepted and license activated.`
          : `Institution "${tenantName}" has been rejected.`,
        tone: status === 'VERIFIED' ? 'success' : 'warning',
      });
      if (selectedTenantDossier?.id === tenantId) {
        setSelectedTenantDossier(null);
      }
      loadData();
    } catch (e: any) {
      showToast({ title: 'Status update failed', description: e.message || 'Unable to update institution status.', tone: 'error' });
    }
  };

  // Institution Accepts / Takes or Rejects a Student Admission
  const handleUpdateAdmission = async (admissionId: string, status: 'ACCEPTED' | 'REJECTED', studentName: string) => {
    try {
      await api.updateAdmissionStatus(admissionId, status);
      showToast({
        title: status === 'ACCEPTED' ? 'Student accepted' : 'Application declined',
        description: status === 'ACCEPTED'
          ? `Student "${studentName}" accepted and enrolled into institutional curriculum.`
          : `Student application for "${studentName}" declined.`,
        tone: status === 'ACCEPTED' ? 'success' : 'warning',
      });
      loadData();
    } catch (e: any) {
      showToast({ title: 'Admission update failed', description: e.message || 'Unable to update student admission.', tone: 'error' });
    }
  };

  // Register New Additional Institution
  const handleCreateAdditionalInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName.trim() || !newInstEmail.trim()) {
      showToast({ title: 'Validation error', description: 'Please enter the institution name and official contact email.', tone: 'error' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newInstEmail.trim())) {
      showToast({ title: 'Invalid email', description: 'Provide a valid institutional email address.', tone: 'error' });
      return;
    }
    if (isSubmittingNew) return;

    setIsSubmittingNew(true);
    try {
      const res = await api.registerTenant({
        institutionName: newInstName.trim(),
        institutionType: newInstType,
        address: newInstAddress.trim(),
        contactEmail: newInstEmail.trim(),
        documents: [
          {
            title: 'Accreditation Authorization Certificate.pdf',
            fileUrl: 'https://docs.edusphere.io/auth-cert.pdf',
            uploadedAt: new Date().toISOString(),
          }
        ],
      });

      if (newInstAutoAccept && res.tenant?.id) {
        await api.updateTenantStatus(res.tenant.id, 'VERIFIED', 'Immediate administrative onboarding approval');
      }

      showToast({
        title: 'Institution onboarded',
        description: `Additional Institution "${newInstName}" created and ${newInstAutoAccept ? 'accepted immediately' : 'placed in pending queue'}.`,
        tone: 'success',
      });
      setShowAddModal(false);
      setNewInstName('');
      setNewInstEmail('');
      setNewInstAddress('');
      loadData();
    } catch (err: any) {
      showToast({ title: 'Institution creation failed', description: err.message || 'Failed to create institution', tone: 'error' });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.contactEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-layout" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar />

      <main className="dashboard-main">
        <ToastViewport toast={toast} onDismiss={dismissToast} />

        {/* Console Header Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div>
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
                <span>Ministry Accredited Control Plane</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>Multi-Tenant Architecture</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', margin: 0 }}>
              Institution & Governance Console
            </h1>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem', marginTop: 4, margin: 0 }}>
              Review accreditation dossiers, onboard universities and academies, and oversee multi-tenant isolation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddModal(true)}
              icon={<PlusCircle size={15} />}
            >
              Add Institution
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={loadData}
              isLoading={isLoadingData}
              icon={<RefreshCw size={14} />}
              title="Reload live database records"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* 4 Standardized Metric Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Accredited Institutions
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: 4, letterSpacing: '-0.02em' }}>
              {tenants.length || metrics.totalInstitutions}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              {tenants.filter(t => t.status === 'PENDING_VERIFICATION').length} awaiting acceptance
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Admissions Queue
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4, letterSpacing: '-0.02em' }}>
              {admissions.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              {admissions.filter(a => a.status === 'PENDING').length} pending intake
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Platform Users
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: 4, letterSpacing: '-0.02em' }}>
              {metrics.totalUsers.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              Multi-tenant isolated
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Accredited Courses
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10B981', marginTop: 4, letterSpacing: '-0.02em' }}>
              {metrics.totalCourses}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: 4 }}>
              Active syllabi
            </div>
          </div>
        </div>

        {/* Segmented Tab Navigation Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid var(--border-color)',
          marginBottom: 24,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}>
          <button
            onClick={() => setActiveTab('institutions')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'institutions' ? 700 : 500,
              color: activeTab === 'institutions' ? 'var(--primary)' : 'var(--slate-500)',
              borderBottom: activeTab === 'institutions' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -1,
            }}
          >
            <Building2 size={16} />
            <span>Institution Accreditation & Onboarding</span>
            <span style={{
              backgroundColor: 'var(--slate-100)',
              color: 'var(--navy-800)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>
              {tenants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('admissions')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'admissions' ? 700 : 500,
              color: activeTab === 'admissions' ? 'var(--primary)' : 'var(--slate-500)',
              borderBottom: activeTab === 'admissions' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -1,
            }}
          >
            <UserCheck size={16} />
            <span>Student Admissions Queue</span>
            <span style={{
              backgroundColor: admissions.filter(a => a.status === 'PENDING').length > 0 ? '#FEF3C7' : 'var(--slate-100)',
              color: admissions.filter(a => a.status === 'PENDING').length > 0 ? '#D97706' : 'var(--slate-700)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}>
              {admissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'audit' ? 700 : 500,
              color: activeTab === 'audit' ? 'var(--primary)' : 'var(--slate-500)',
              borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -1,
            }}
          >
            <Clock size={16} />
            <span>System Audit & Compliance Log</span>
          </button>
        </div>

        {/* TAB 1: INSTITUTION ACCREDITATION */}
        {activeTab === 'institutions' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            {/* Search and Filters */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 20,
            }}>
              <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 360 }}>
                <Search size={15} color="var(--slate-400)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search institutions by name or email..."
                  className="input-field"
                  style={{ paddingLeft: 36, height: 38, fontSize: '0.86rem' }}
                />
              </div>

              {/* Status Filter Chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['ALL', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'] as const).map(st => {
                  const isSelected = statusFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: isSelected ? 'var(--primary)' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : 'var(--navy-900)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {st === 'ALL' && 'All Statuses'}
                      {st === 'PENDING_VERIFICATION' && 'Pending Verification'}
                      {st === 'VERIFIED' && 'Accepted / Verified'}
                      {st === 'REJECTED' && 'Rejected'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Institutions Table */}
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid var(--border-color)',
                    textAlign: 'left',
                    color: 'var(--slate-500)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: 'var(--slate-50)',
                  }}>
                    <th style={{ padding: '10px 14px' }}>Institution</th>
                    <th style={{ padding: '10px 14px' }}>Type</th>
                    <th style={{ padding: '10px 14px' }}>Domain Slug</th>
                    <th style={{ padding: '10px 14px' }}>Accreditation</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.length > 0 ? (
                    filteredTenants.map(t => {
                      const isPending = t.status === 'PENDING_VERIFICATION';
                      const isVerified = t.status === 'VERIFIED';
                      const isRejected = t.status === 'REJECTED';

                      return (
                        <tr key={t.id} style={{
                          borderBottom: '1px solid var(--border-subtle)',
                        }}>
                          {/* Name & Contact */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--navy-950)' }}>{t.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{t.contactEmail}</div>
                          </td>

                          {/* Type */}
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--slate-600)', backgroundColor: 'var(--slate-100)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                              {t.type.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Domain */}
                          <td style={{ padding: '12px 14px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {t.domains[0] || `${t.slug}.edusphere.io`}
                          </td>

                          {/* Dossier Documents */}
                          <td style={{ padding: '12px 14px' }}>
                            <button
                              onClick={() => setSelectedTenantDossier(t)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '4px 8px',
                                fontSize: '0.76rem',
                                color: 'var(--navy-900)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <FileText size={13} color="var(--primary)" />
                              <span>{t.verificationDocuments?.length || 1} doc(s)</span>
                            </button>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '12px 14px' }}>
                            {isVerified && (
                              <span style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                                Verified
                              </span>
                            )}
                            {isPending && (
                              <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                                Pending
                              </span>
                            )}
                            {isRejected && (
                              <span style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                                Rejected
                              </span>
                            )}
                          </td>

                          {/* Actions: ACCEPT / TAKE or REJECT */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                              {isPending ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleUpdateTenantStatus(t.id, 'VERIFIED', t.name)}
                                    icon={<Check size={13} />}
                                    title="Accept institution and grant license"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleUpdateTenantStatus(t.id, 'REJECTED', t.name)}
                                    icon={<X size={13} />}
                                    title="Decline application"
                                  >
                                    Decline
                                  </Button>
                                </>
                              ) : isVerified ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setSelectedTenantDossier(t)}
                                  icon={<Eye size={12} />}
                                >
                                  Dossier
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleUpdateTenantStatus(t.id, 'VERIFIED', t.name)}
                                >
                                  Re-evaluate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: 36, textAlign: 'center' }}>
                        <EmptyState
                          title="No Institutions Found"
                          description="No institutions match your search query or filter selection."
                          actionLabel="Clear Filters"
                          onAction={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT ADMISSIONS QUEUE */}
        {activeTab === 'admissions' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', margin: 0 }}>
                Student Admissions & Cohort Enrollment
              </h3>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.86rem', marginTop: 2 }}>
                Review incoming student enrollment applications to institutional programs and accept them into active cohorts.
              </p>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid var(--border-color)',
                    textAlign: 'left',
                    color: 'var(--slate-500)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    backgroundColor: 'var(--slate-50)',
                  }}>
                    <th style={{ padding: '10px 14px' }}>Applicant</th>
                    <th style={{ padding: '10px 14px' }}>Target Institution</th>
                    <th style={{ padding: '10px 14px' }}>Applied Program</th>
                    <th style={{ padding: '10px 14px' }}>Qualifications</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.length > 0 ? (
                    admissions.map(adm => (
                      <tr key={adm.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--navy-950)' }}>{adm.studentName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{adm.studentEmail}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--primary)' }}>
                          {adm.institutionName}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--navy-950)' }}>
                          {adm.programOrCourse}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--slate-600)' }}>
                          {adm.qualifications}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {adm.status === 'ACCEPTED' && (
                            <span style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                              Enrolled
                            </span>
                          )}
                          {adm.status === 'PENDING' && (
                            <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                              Pending
                            </span>
                          )}
                          {adm.status === 'REJECTED' && (
                            <span style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                              Declined
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {adm.status === 'PENDING' ? (
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleUpdateAdmission(adm.id, 'ACCEPTED', adm.studentName)}
                                icon={<Check size={13} />}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleUpdateAdmission(adm.id, 'REJECTED', adm.studentName)}
                                icon={<X size={13} />}
                              >
                                Decline
                              </Button>
                            </div>
                          ) : adm.status === 'ACCEPTED' ? (
                            <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>
                              ✓ Active Roster
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleUpdateAdmission(adm.id, 'ACCEPTED', adm.studentName)}
                            >
                              Re-admit
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: 36, textAlign: 'center' }}>
                        <EmptyState
                          title="No Admissions in Queue"
                          description="There are currently no pending student applications across institutional programs."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT FEED */}
        {activeTab === 'audit' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 16 }}>
              Security & Compliance Audit Trail
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.length > 0 ? (
                activities.map(act => (
                  <div key={act.id} style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.86rem',
                  }}>
                    <div style={{
                      padding: 8,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--slate-200)',
                      color: 'var(--navy-900)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--navy-950)' }}>
                          {act.actorName} ({act.actorRole})
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: 'var(--slate-700)', marginTop: 2 }}>{act.details}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: 2, fontFamily: 'monospace' }}>
                        IP Address: {act.ipAddress}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Audit Trail Clean"
                  description="All compliance checks are in order. No security anomalies recorded."
                />
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: INSPECT INSTITUTION DOSSIER */}
        <Modal
          isOpen={Boolean(selectedTenantDossier)}
          onClose={() => setSelectedTenantDossier(null)}
          title={selectedTenantDossier ? `${selectedTenantDossier.name} — Accreditation Dossier` : ''}
          maxWidth={620}
        >
          {selectedTenantDossier && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ backgroundColor: 'var(--slate-100)', color: 'var(--navy-900)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                  {selectedTenantDossier.type}
                </span>
                {selectedTenantDossier.status === 'VERIFIED' ? (
                  <span style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                    Verified Institution
                  </span>
                ) : (
                  <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', fontWeight: 700 }}>
                    Awaiting Approval
                  </span>
                )}
              </div>

              <div style={{
                backgroundColor: 'var(--slate-50)',
                padding: 14,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Subdomain & Routing
                </div>
                <div style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700, fontSize: '0.92rem', marginTop: 2 }}>
                  {selectedTenantDossier.domains[0] || `${selectedTenantDossier.slug}.edusphere.io`}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Contact Email</div>
                  <div style={{ fontWeight: 600, color: 'var(--navy-950)', marginTop: 2, fontSize: '0.88rem' }}>{selectedTenantDossier.contactEmail}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Campus Location</div>
                  <div style={{ fontWeight: 600, color: 'var(--navy-950)', marginTop: 2, fontSize: '0.88rem' }}>{selectedTenantDossier.address || 'National Academic Territory'}</div>
                </div>
              </div>

              {/* Submitted Legal Documents */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--navy-950)', marginBottom: 6 }}>
                  Submitted Accreditation Documents:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedTenantDossier.verificationDocuments?.map((doc, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--slate-50)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.84rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--navy-900)' }}>
                        <FileText size={15} color="var(--primary)" />
                        <span>{doc.title}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                        Hash Verified
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 8,
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)',
              }}>
                <Button variant="secondary" size="md" onClick={() => setSelectedTenantDossier(null)}>
                  Close
                </Button>
                {selectedTenantDossier.status !== 'VERIFIED' && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleUpdateTenantStatus(selectedTenantDossier.id, 'VERIFIED', selectedTenantDossier.name)}
                    icon={<Check size={14} />}
                  >
                    Accept & Grant License
                  </Button>
                )}
                {selectedTenantDossier.status === 'VERIFIED' && (
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => handleUpdateTenantStatus(selectedTenantDossier.id, 'REJECTED', selectedTenantDossier.name)}
                  >
                    Revoke License
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL 2: REGISTER ADDITIONAL INSTITUTION */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Onboard Additional Institution"
          maxWidth={560}
        >
          <form onSubmit={handleCreateAdditionalInstitution} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 4 }}>
                Institution Name *
              </label>
              <input
                type="text"
                value={newInstName}
                onChange={e => setNewInstName(e.target.value)}
                placeholder="e.g. Addis Ababa Institute of Technology"
                className="input-field"
                style={{ height: 40, fontSize: '0.88rem' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 4 }}>
                  Institution Type
                </label>
                <select
                  value={newInstType}
                  onChange={e => setNewInstType(e.target.value)}
                  className="input-field"
                  style={{ height: 40, fontSize: '0.88rem' }}
                >
                  <option value="UNIVERSITY">University & Higher Ed</option>
                  <option value="K12_SCHOOL">K-12 School</option>
                  <option value="TRAINING_CENTER">TVET / Training Academy</option>
                  <option value="INDEPENDENT_PROVIDER">Independent Academy</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 4 }}>
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={newInstEmail}
                  onChange={e => setNewInstEmail(e.target.value)}
                  placeholder="dean@institution.edu"
                  className="input-field"
                  style={{ height: 40, fontSize: '0.88rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 4 }}>
                Campus Location
              </label>
              <input
                type="text"
                value={newInstAddress}
                onChange={e => setNewInstAddress(e.target.value)}
                placeholder="Campus address / city"
                className="input-field"
                style={{ height: 40, fontSize: '0.88rem' }}
              />
            </div>

            <div style={{
              backgroundColor: 'var(--slate-50)',
              border: '1px solid var(--border-color)',
              padding: 12,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <input
                type="checkbox"
                id="autoAcceptCheck"
                checked={newInstAutoAccept}
                onChange={e => setNewInstAutoAccept(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="autoAcceptCheck" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--navy-950)', cursor: 'pointer' }}>
                Accept & Activate Immediately (Bypasses pending review queue)
              </label>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 6,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <Button type="button" variant="secondary" size="md" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmittingNew}>
                {isSubmittingNew ? 'Registering...' : 'Register & Onboard'}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
};
