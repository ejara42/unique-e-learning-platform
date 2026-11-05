import React from 'react';
import { useApp } from '../context/AppContext';
import { Logo } from './Logo';
import { 
  LayoutDashboard, 
  BookOpen, 
  Compass, 
  Settings, 
  LogOut, 
  PlusCircle, 
  Building2, 
  Award, 
  Video, 
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, currentUser, logoutUser } = useApp();
  const role = currentUser?.activeRole || 'STUDENT';

  const isTeacher = role === 'INSTRUCTOR';
  const isAdmin = role === 'PLATFORM_ADMIN' || role === 'INSTITUTION_ADMIN';

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    color: isActive ? '#FFFFFF' : '#94A3B8',
    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
    fontWeight: isActive ? 600 : 500,
    fontSize: '0.86rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginBottom: 4,
    border: 'none',
    width: '100%',
    textAlign: 'left',
  });

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '12px 14px 6px',
  };

  return (
    <aside className="app-sidebar">
      <div>
        {/* Brand Header */}
        <div 
          onClick={() => setCurrentPage('landing')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            marginBottom: 24, 
            cursor: 'pointer', 
            padding: '4px 6px' 
          }}
          title="Go to Homepage"
        >
          <Logo size={32} />
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              <span>Edu</span><span style={{ color: '#818CF8' }}>Sphere</span>
            </div>
            <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Unified LMS
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="app-sidebar-nav-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={sectionLabelStyle}>Main Workspace</div>

          {isAdmin ? (
            <>
              <button 
                onClick={() => setCurrentPage('admin-dashboard')} 
                style={navItemStyle(currentPage === 'admin-dashboard')}
              >
                <LayoutDashboard size={18} />
                <span>Admin Console</span>
              </button>
              <button 
                onClick={() => setCurrentPage('institution-register')} 
                style={navItemStyle(currentPage === 'institution-register')}
              >
                <Building2 size={18} />
                <span>Onboard Institution</span>
              </button>
              <button 
                onClick={() => setCurrentPage('teacher-studio')} 
                style={navItemStyle(currentPage === 'teacher-studio')}
              >
                <BookOpen size={18} />
                <span>Course Studio</span>
              </button>
            </>
          ) : isTeacher ? (
            <>
              <button 
                onClick={() => setCurrentPage('teacher-studio')} 
                style={navItemStyle(currentPage === 'teacher-studio')}
              >
                <BookOpen size={18} />
                <span>My Curriculum</span>
              </button>
              <button 
                onClick={() => setCurrentPage('teacher-studio')} 
                style={navItemStyle(false)}
              >
                <PlusCircle size={18} />
                <span>Create Course</span>
              </button>
              <button 
                onClick={() => setCurrentPage('live-classroom')} 
                style={navItemStyle(currentPage === 'live-classroom')}
              >
                <Video size={18} />
                <span>Live Classroom</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setCurrentPage('learner-dashboard')} 
                style={navItemStyle(currentPage === 'learner-dashboard')}
              >
                <LayoutDashboard size={18} />
                <span>Learner Dashboard</span>
              </button>
              <button 
                onClick={() => setCurrentPage('my-courses')} 
                style={navItemStyle(currentPage === 'my-courses')}
              >
                <BookOpen size={18} />
                <span>My Courses</span>
              </button>
              <button 
                onClick={() => setCurrentPage('landing')} 
                style={navItemStyle(false)}
              >
                <Compass size={18} />
                <span>Course Catalog</span>
              </button>
              <button 
                onClick={() => setCurrentPage('live-classroom')} 
                style={navItemStyle(currentPage === 'live-classroom')}
              >
                <Video size={18} />
                <span>Live Class</span>
              </button>
            </>
          )}

          <div style={sectionLabelStyle}>Credentials & Verification</div>

          <button 
            onClick={() => setCurrentPage('certificate-verify')} 
            style={navItemStyle(currentPage === 'certificate-verify')}
          >
            <ShieldCheck size={18} color={currentPage === 'certificate-verify' ? '#FFFFFF' : '#14B8A6'} />
            <span>Verify Certificates</span>
          </button>
        </div>
      </div>

      {/* Bottom Profile / Account Panel */}
      <div style={{ paddingTop: 16, borderTop: '1px solid var(--navy-800)' }}>
        {currentUser ? (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            marginBottom: 10,
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.82rem',
                fontWeight: 800,
                flexShrink: 0,
              }}>
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.fullName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#818CF8', fontWeight: 600 }}>
                  {currentUser.activeRole.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <button 
          onClick={logoutUser} 
          style={{
            ...navItemStyle(false),
            color: '#F87171',
            padding: '8px 12px',
            fontSize: '0.84rem',
          }}
          title="Sign out of EduSphere"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
