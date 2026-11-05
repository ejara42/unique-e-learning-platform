import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldAlert, Lock, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
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
  const { currentUser, setCurrentPage, switchUserRole } = useApp();

  // If user is authenticated and has an allowed activeRole, grant access
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

  // Case 1: Unauthenticated (No user session) -> Strict Authentication Wall
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
          maxWidth: 540,
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06)',
          padding: '40px 32px',
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
            Protected Workspace
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.02em' }}>
            {workspaceName}
          </h2>

          <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
            {description} Access is restricted to registered and verified <strong>{allowedRoles.map(r => roleLabels[r] || r).join(', ')}</strong> accounts. Please authenticate to continue.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => setCurrentPage('login')}
              style={{ padding: '10px 22px', fontSize: '0.92rem' }}
            >
              <LogIn size={16} style={{ marginRight: 8 }} />
              Sign In to Account
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCurrentPage('register')}
              style={{ padding: '10px 20px', fontSize: '0.92rem' }}
            >
              <UserPlus size={16} style={{ marginRight: 8 }} />
              Register Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Authenticated with Insufficient Role -> Access Denied Wall
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
        maxWidth: 560,
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
          Access Denied: Insufficient Privileges
        </h2>

        <p style={{ fontSize: '0.92rem', color: '#64748B', lineHeight: 1.5, marginBottom: 20 }}>
          You are signed in as <strong>{currentUser.fullName}</strong> with role <strong>{currentUser.activeRole.replace('_', ' ')}</strong>.
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
              Your account has registered permission to assume the <strong>{roleLabels[availableRole] || availableRole}</strong> role.
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
        </div>
      </div>
    </div>
  );
};
