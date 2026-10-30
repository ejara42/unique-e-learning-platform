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
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  FileText,
  UserCheck,
  Eye,
  AlertCircle,
  Search,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { Button, Badge, StatCard, Modal, EmptyState, ToastViewport, useToast } from '../components/ui';

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
      .catch(() => {});
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
          marginBottom: 32,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                border: '1px solid rgba(20, 184, 166, 0.3)',
                color: 'var(--teal-700)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
              }}>
                <MinistryLogo size={16} />
                <span>Ministry Accredited Console</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Multi-Tenant Control Plane</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em' }}>
              Institution & Governance Console
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
              Review and accept institution accreditation requests, onboard additional institutions, and govern admissions.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button 
              variant="primary"
              onClick={() => setShowAddModal(true)} 
              icon={<PlusCircle size={18} />}
            >
              Add Institution
            </Button>
            <Button 
              variant="secondary"
              onClick={loadData} 
              isLoading={isLoadingData}
              icon={<RefreshCw size={16} />}
              title="Reload live database records"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* 4 Standardized Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}>
          <StatCard 
            label="Accredited Institutions"
            value={tenants.length || metrics.totalInstitutions}
            icon={<Building2 size={22} />}
            color="primary"
            trendText={`${tenants.filter(t => t.status === 'PENDING_VERIFICATION').length} awaiting acceptance`}
            trendType="warning"
          />

          <StatCard 
            label="Admissions Queue"
            value={admissions.length}
            icon={<UserCheck size={22} />}
            color="teal"
            trendText={`${admissions.filter(a => a.status === 'PENDING').length} pending student intake`}
            trendType="neutral"
          />

          <StatCard 
            label="Registered Users"
            value={metrics.totalUsers.toLocaleString()}
            icon={<Users size={22} />}
            color="indigo"
            trendText="Multi-tenant isolated"
            trendType="positive"
          />

          <StatCard 
            label="Academic Courses"
            value={metrics.totalCourses}
            icon={<BookOpen size={22} />}
            color="teal"
            trendText="Verified credentials"
            trendType="positive"
          />
        </div>

        {/* Segmented Tab Navigation Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '2px solid var(--border-color)',
          marginBottom: 28,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}>
          <button
            onClick={() => setActiveTab('institutions')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.94rem',
              fontWeight: activeTab === 'institutions' ? 800 : 600,
              color: activeTab === 'institutions' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'institutions' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2,
              transition: 'all 0.15s ease',
            }}
          >
            <Building2 size={18} />
            <span>Institution Accreditation & Onboarding</span>
            <span style={{
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: '0.75rem',
              fontWeight: 800,
            }}>
              {tenants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('admissions')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.94rem',
              fontWeight: activeTab === 'admissions' ? 800 : 600,
              color: activeTab === 'admissions' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'admissions' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2,
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={18} />
            <span>Student Admissions ("Accept / Take Students")</span>
            <span style={{
              backgroundColor: admissions.filter(a => a.status === 'PENDING').length > 0 ? '#FEF3C7' : 'var(--slate-200)',
              color: admissions.filter(a => a.status === 'PENDING').length > 0 ? '#D97706' : 'var(--slate-700)',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: '0.75rem',
              fontWeight: 800,
            }}>
              {admissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.94rem',
              fontWeight: activeTab === 'audit' ? 800 : 600,
              color: activeTab === 'audit' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'audit' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2,
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={18} />
            <span>System Audit & Compliance Log</span>
          </button>
        </div>

        {/* TAB 1: INSTITUTION ACCREDITATION */}
        {activeTab === 'institutions' && (
          <div className="card" style={{ padding: 24 }}>
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
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 12 }} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search institutions by name or email..."
                  className="input-field"
                  style={{ paddingLeft: 38, height: 40, fontSize: '0.88rem' }}
                />
              </div>

              {/* Status Filter Chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['ALL', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'] as const).map(st => {
                  const isSelected = statusFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: isSelected ? 'var(--primary)' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : 'var(--text-main)',
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid var(--border-color)',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--slate-50)',
                  }}>
                    <th style={{ padding: '12px 16px' }}>INSTITUTION</th>
                    <th style={{ padding: '12px 16px' }}>TYPE</th>
                    <th style={{ padding: '12px 16px' }}>DOMAIN SLUG</th>
                    <th style={{ padding: '12px 16px' }}>ACCREDITATION</th>
                    <th style={{ padding: '12px 16px' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACCEPT / ACTIONS</th>
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
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background-color 0.15s',
                        }}>
                          {/* Name & Contact */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--navy-950)' }}>{t.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.contactEmail}</div>
                          </td>

                          {/* Type */}
                          <td style={{ padding: '14px 16px' }}>
                            <Badge variant="neutral">{t.type.replace('_', ' ')}</Badge>
                          </td>

                          {/* Domain */}
                          <td style={{ padding: '14px 16px', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {t.domains[0] || `${t.slug}.edusphere.io`}
                          </td>

                          {/* Dossier Documents */}
                          <td style={{ padding: '14px 16px' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedTenantDossier(t)}
                              icon={<FileText size={14} color="var(--primary)" />}
                              title="Inspect accreditation documents"
                            >
                              {t.verificationDocuments?.length || 1} doc(s)
                            </Button>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '14px 16px' }}>
                            {isVerified && <Badge variant="verified">Accepted / Verified</Badge>}
                            {isPending && <Badge variant="pending">Pending Review</Badge>}
                            {isRejected && <Badge variant="danger">Rejected</Badge>}
                          </td>

                          {/* Actions: ACCEPT / TAKE or REJECT */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                              {isPending ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="teal"
                                    onClick={() => handleUpdateTenantStatus(t.id, 'VERIFIED', t.name)}
                                    icon={<Check size={14} />}
                                    title="Accept institution and grant license"
                                  >
                                    Accept & Take
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleUpdateTenantStatus(t.id, 'REJECTED', t.name)}
                                    icon={<X size={14} />}
                                    title="Decline application"
                                  >
                                    Decline
                                  </Button>
                                </>
                              ) : isVerified ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--teal-700)', fontWeight: 700 }}>
                                    ✓ Active Tenant
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedTenantDossier(t)}
                                    icon={<Eye size={13} />}
                                  >
                                    View
                                  </Button>
                                </div>
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
                      <td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
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
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)' }}>
                Institutional Student Admissions ("Accept / Take Students")
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Review incoming student enrollment applications to institutional academic programs and accept ("take") them into active cohorts.
              </p>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid var(--border-color)',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--slate-50)',
                  }}>
                    <th style={{ padding: '12px 16px' }}>STUDENT APPLICANT</th>
                    <th style={{ padding: '12px 16px' }}>TARGET INSTITUTION</th>
                    <th style={{ padding: '12px 16px' }}>APPLIED PROGRAM</th>
                    <th style={{ padding: '12px 16px' }}>QUALIFICATIONS</th>
                    <th style={{ padding: '12px 16px' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.length > 0 ? (
                    admissions.map(adm => (
                      <tr key={adm.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--navy-950)' }}>{adm.studentName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{adm.studentEmail}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                          {adm.institutionName}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--navy-950)' }}>
                          {adm.programOrCourse}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                          {adm.qualifications}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {adm.status === 'ACCEPTED' && <Badge variant="verified">Accepted & Enrolled</Badge>}
                          {adm.status === 'PENDING' && <Badge variant="pending">Pending Decision</Badge>}
                          {adm.status === 'REJECTED' && <Badge variant="danger">Declined</Badge>}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {adm.status === 'PENDING' ? (
                            <div style={{ display: 'inline-flex', gap: 8 }}>
                              <Button
                                size="sm"
                                variant="teal"
                                onClick={() => handleUpdateAdmission(adm.id, 'ACCEPTED', adm.studentName)}
                                icon={<Check size={14} />}
                              >
                                Accept Student
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleUpdateAdmission(adm.id, 'REJECTED', adm.studentName)}
                                icon={<X size={14} />}
                              >
                                Decline
                              </Button>
                            </div>
                          ) : adm.status === 'ACCEPTED' ? (
                            <span style={{ fontSize: '0.82rem', color: 'var(--teal-700)', fontWeight: 700 }}>
                              ✓ Enrolled on Roster
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
                      <td colSpan={6} style={{ padding: 48, textAlign: 'center' }}>
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
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 18 }}>
              Security & Compliance Audit Trail
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activities.length > 0 ? (
                activities.map(act => (
                  <div key={act.id} style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    padding: '14px 16px',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                  }}>
                    <div style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ShieldCheck size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--navy-950)' }}>
                          {act.actorName} ({act.actorRole})
                        </span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: 'var(--slate-700)', marginTop: 4 }}>{act.details}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
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
          maxWidth={640}
        >
          {selectedTenantDossier && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge variant="primary">{selectedTenantDossier.type}</Badge>
                {selectedTenantDossier.status === 'VERIFIED' ? (
                  <Badge variant="verified">Verified Institution</Badge>
                ) : (
                  <Badge variant="pending">Awaiting Approval</Badge>
                )}
              </div>

              <div style={{
                backgroundColor: 'var(--slate-50)',
                padding: 16,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Subdomain & Routing
                </div>
                <div style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 800, fontSize: '0.98rem', marginTop: 4 }}>
                  {selectedTenantDossier.domains[0] || `${selectedTenantDossier.slug}.edusphere.io`}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Email</div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-950)', marginTop: 2 }}>{selectedTenantDossier.contactEmail}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Campus Location</div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-950)', marginTop: 2 }}>{selectedTenantDossier.address || 'National Academic Territory'}</div>
                </div>
              </div>

              {/* Submitted Legal Documents */}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy-950)', marginBottom: 8 }}>
                  Submitted Accreditation Credentials:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedTenantDossier.verificationDocuments?.map((doc, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#EEF2FF',
                      border: '1px solid #C7D2FE',
                      fontSize: '0.86rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--primary)' }}>
                        <FileText size={16} />
                        <span>{doc.title}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800 }}>
                        Hash Verified 🛡️
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 12,
                paddingTop: 16,
                borderTop: '1px solid var(--border-color)',
              }}>
                <Button variant="secondary" onClick={() => setSelectedTenantDossier(null)}>
                  Close
                </Button>
                {selectedTenantDossier.status !== 'VERIFIED' && (
                  <Button
                    variant="teal"
                    onClick={() => handleUpdateTenantStatus(selectedTenantDossier.id, 'VERIFIED', selectedTenantDossier.name)}
                    icon={<Check size={16} />}
                  >
                    Accept & Grant License
                  </Button>
                )}
                {selectedTenantDossier.status === 'VERIFIED' && (
                  <Button
                    variant="danger"
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
          maxWidth={580}
        >
          <form onSubmit={handleCreateAdditionalInstitution} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                Institution Name *
              </label>
              <input 
                type="text" 
                value={newInstName}
                onChange={e => setNewInstName(e.target.value)}
                placeholder="e.g. Addis Ababa Institute of Technology"
                className="input-field"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Institution Type
                </label>
                <select
                  value={newInstType}
                  onChange={e => setNewInstType(e.target.value)}
                  className="input-field"
                >
                  <option value="UNIVERSITY">University & Higher Ed</option>
                  <option value="K12_SCHOOL">K-12 School</option>
                  <option value="TRAINING_CENTER">TVET / Training Academy</option>
                  <option value="INDEPENDENT_PROVIDER">Independent Academy</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                  Contact Email *
                </label>
                <input 
                  type="email" 
                  value={newInstEmail}
                  onChange={e => setNewInstEmail(e.target.value)}
                  placeholder="admin@institution.edu"
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 6 }}>
                Campus Location
              </label>
              <input 
                type="text" 
                value={newInstAddress}
                onChange={e => setNewInstAddress(e.target.value)}
                placeholder="Campus address / city"
                className="input-field"
              />
            </div>

            <div style={{
              backgroundColor: 'var(--primary-light)',
              padding: 14,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <input 
                type="checkbox" 
                id="autoAcceptCheck"
                checked={newInstAutoAccept}
                onChange={e => setNewInstAutoAccept(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="autoAcceptCheck" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy-950)', cursor: 'pointer' }}>
                Accept & Activate Immediately (Bypasses pending review queue)
              </label>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 10,
              paddingTop: 16,
              borderTop: '1px solid var(--border-color)',
            }}>
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingNew}>
                {isSubmittingNew ? 'Registering...' : 'Register & Onboard'}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
};
