import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldAlert, Lock, ArrowRight, Sparkles, UserCheck, ArrowLeft, Building2, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';
import { Button } from './ui';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  workspaceName: string;
  description: string;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  workspaceName,
  description,
  children,
}) => {
  const { currentUser, setCurrentPage, demoLoginUser, switchUserRole } = useApp();

  // If user is authenticated and has allowed activeRole, render children immediately
  if (currentUser && allowedRoles.includes(currentUser.activeRole)) {
    return <>{children}</>;
  }

  const roleLabels: Record<string, string> = {
    STUDENT: 'Student / Learner',
    INDEPENDENT_LEARNER: 'Self-Paced Learner',
    INSTRUCTOR: 'Faculty Instructor',
    INSTITUTION_ADMIN: 'Institution Administrator',
    PLATFORM_ADMIN: 'Platform Superadmin',
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'INSTRUCTOR':
        return <BookOpen size={18} />;
      case 'INSTITUTION_ADMIN':
        return <Building2 size={18} />;
      case 'PLATFORM_ADMIN':
        return <ShieldCheck size={18} />;
      default:
        return <GraduationCap size={18} />;
    }
  };

  // Case 1: Unauthenticated (Not signed in)
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        backgroundColor: '#F8FAFC',
      }}>
        <div style={{
          maxWidth: 640,
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06)',
          padding: '36px 32px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            border: '1px solid #DBEAFE',
          }}>
            <Lock size={26} />
          </div>

          <div style={{
            display: 'inline-block',
            padding: '3px 10px',
            backgroundColor: '#F1F5F9',
            borderRadius: 20,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
          }}>
            Role-Based Access Control
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.02em' }}>
            {workspaceName}
          </h2>

          <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            {description} This workspace is restricted to <strong>{allowedRoles.map(r => roleLabels[r] || r).join(', ')}</strong> roles.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentPage('login')}
                style={{ padding: '10px 24px', fontSize: '0.92rem' }}
              >
                Sign In with Credentials
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentPage('register')}
                style={{ padding: '10px 20px', fontSize: '0.92rem' }}
              >
                Register New Account
              </Button>
            </div>
          </div>

          {/* Instant Role Preview Section (No Registration Required) */}
          <div style={{
            borderTop: '1px solid #E2E8F0',
            paddingTop: 24,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Sparkles size={16} color="#1D4ED8" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Instant Role Preview (Explore Without Registration)
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 14 }}>
              Select a role below to immediately test and inspect this dashboard with a fully authenticated preview session:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 10,
            }}>
              {allowedRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => demoLoginUser(role)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1D4ED8';
                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: '#1D4ED8' }}>{getRoleIcon(role)}</div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                        {roleLabels[role] || role}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        1-Click Test Access
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={15} color="#1D4ED8" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Authenticated but Insufficient Active Role
  const hasAlternativeAuthorizedRole = currentUser.authorizedRoles?.some(r => allowedRoles.includes(r));
  const availableRole = currentUser.authorizedRoles?.find(r => allowedRoles.includes(r));

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      backgroundColor: '#F8FAFC',
    }}>
      <div style={{
        maxWidth: 600,
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06)',
        padding: '36px 32px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          border: '1px solid #FEE2E2',
        }}>
          <ShieldAlert size={26} />
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Access Restricted: Role Privileges Required
        </h2>

        <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, marginBottom: 20 }}>
          You are currently signed in as <strong>{currentUser.fullName}</strong> with active role <strong>{currentUser.activeRole.replace('_', ' ')}</strong>.
          This workspace requires <strong>{allowedRoles.map(r => roleLabels[r] || r).join(' or ')}</strong> credentials.
        </p>

        {hasAlternativeAuthorizedRole && availableRole ? (
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>
              Authorized Role Detected
            </div>
            <p style={{ fontSize: '0.82rem', color: '#1E3A8A', marginBottom: 12 }}>
              Your account has permission to assume the <strong>{roleLabels[availableRole] || availableRole}</strong> role.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => switchUserRole(availableRole)}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Switch Active Role to {roleLabels[availableRole] || availableRole}
            </Button>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (currentUser.activeRole === 'PLATFORM_ADMIN' || currentUser.activeRole === 'INSTITUTION_ADMIN') {
                setCurrentPage('admin-dashboard');
              } else if (currentUser.activeRole === 'INSTRUCTOR') {
                setCurrentPage('teacher-studio');
              } else {
                setCurrentPage('learner-dashboard');
              }
            }}
            style={{ padding: '9px 18px', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={15} style={{ marginRight: 6 }} />
            Return to My Workspace
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => demoLoginUser(allowedRoles[0])}
            style={{ padding: '9px 18px', fontSize: '0.88rem' }}
          >
            <Sparkles size={15} style={{ marginRight: 6 }} />
            Explore as {roleLabels[allowedRoles[0]] || allowedRoles[0]} Demo
          </Button>
        </div>
      </div>
    </div>
  );
};
