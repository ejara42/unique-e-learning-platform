import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICourse, ITenant } from '../types';
import { 
  Search, 
  School, 
  GraduationCap, 
  Briefcase, 
  UserCheck, 
  Star, 
  ArrowRight,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Video,
  FileCheck2,
  Building2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button, ErrorState, LoadingState } from '../components/ui';
import { CourseCatalog } from '../components/catalog/CourseCatalog';

export const LandingPage: React.FC = () => {
  const { openCourse, setCurrentPage, openVerification, t } = useApp();
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [tenants, setTenants] = useState<ITenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [activeAudience, setActiveAudience] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCatalog = async () => {
    setIsLoadingPage(true);
    setLoadError(null);

    try {
      const [coursesResult, tenantsResult] = await Promise.all([
        api.getCourses(),
        api.getTenants(),
      ]);

      setCourses(coursesResult.courses || []);
      setTenants(tenantsResult.tenants || []);
    } catch (error: any) {
      setCourses([]);
      setTenants([]);
      setLoadError(error?.message || 'Unable to load the course catalog right now.');
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    api.getCourses({ search: searchTerm })
      .then(res => setCourses(res.courses))
      .finally(() => setIsSearching(false));
  };

  const handleDirectVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;
    openVerification(verifyCodeInput.trim().toUpperCase());
  };

  const audienceCategories = [
    { 
      id: 'schools', 
      label: 'Primary & High Schools', 
      subtext: 'Grades 1-12 standardized curriculum, parent progress tracking, and digital attendance', 
      icon: <School size={20} color="var(--primary)" /> 
    },
    { 
      id: 'universities', 
      label: 'Universities & Colleges', 
      subtext: 'Accredited undergraduate and graduate degree coursework with strict multi-tenant isolation', 
      icon: <GraduationCap size={20} color="var(--primary)" /> 
    },
    { 
      id: 'training', 
      label: 'TVET & Technical Institutes', 
      subtext: 'Vocational certifications, hands-on lab modules, and industry career pathways', 
      icon: <Briefcase size={20} color="var(--primary)" /> 
    },
    { 
      id: 'independent', 
      label: 'Independent Scholars', 
      subtext: 'Self-paced professional courses, open syllabus access, and verified credentials', 
      icon: <UserCheck size={20} color="var(--primary)" /> 
    },
  ];

  const educationTiers = [
    { id: 'All', label: 'All Academic Tiers' },
    { id: 'primary', label: 'Primary (Grades 1-8)' },
    { id: 'secondary', label: 'High School (Grades 9-12)' },
    { id: 'college', label: 'College & TVET' },
    { id: 'university', label: 'University Degree' },
    { id: 'skills', label: 'Professional Skills' },
  ];

  const filteredCourses = courses.filter(course => {
    // 1. Audience card filter
    if (activeAudience !== 'All') {
      if (activeAudience === 'schools') {
        const isSchool = course.level?.toLowerCase().includes('primary') ||
                         course.level?.toLowerCase().includes('secondary') ||
                         course.level?.toLowerCase().includes('school') ||
                         course.category?.toLowerCase().includes('primary') ||
                         course.institutionName?.toLowerCase().includes('school');
        if (!isSchool) return false;
      } else if (activeAudience === 'universities') {
        const isUniv = course.level?.toLowerCase().includes('university') ||
                       course.level?.toLowerCase().includes('undergraduate') ||
                       course.institutionName?.toLowerCase().includes('university') ||
                       course.institutionName?.toLowerCase().includes('college');
        if (!isUniv) return false;
      } else if (activeAudience === 'training') {
        const isTraining = course.level?.toLowerCase().includes('tvet') ||
                           course.level?.toLowerCase().includes('college') ||
                           course.level?.toLowerCase().includes('professional') ||
                           course.institutionName?.toLowerCase().includes('training') ||
                           course.institutionName?.toLowerCase().includes('center');
        if (!isTraining) return false;
      } else if (activeAudience === 'independent') {
        if (course.visibility !== 'PUBLIC') return false;
      }
    }

    // 2. Education Tier tab filter
    if (selectedTier !== 'All') {
      if (selectedTier === 'primary' && !course.level?.toLowerCase().includes('primary') && !course.category?.toLowerCase().includes('primary')) return false;
      if (selectedTier === 'secondary' && !course.level?.toLowerCase().includes('secondary') && !course.level?.toLowerCase().includes('high school')) return false;
      if (selectedTier === 'college' && !course.level?.toLowerCase().includes('college') && !course.level?.toLowerCase().includes('tvet')) return false;
      if (selectedTier === 'university' && !course.level?.toLowerCase().includes('university') && !course.level?.toLowerCase().includes('undergraduate')) return false;
      if (selectedTier === 'skills' && !course.level?.toLowerCase().includes('professional') && !course.level?.toLowerCase().includes('all levels')) return false;
    }

    // 3. Category filter
    if (selectedCategory !== 'All') {
      if (!course.category?.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Hero Section: Clean, Authoritative, Photographic */}
      <section style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-color)',
        padding: '56px 24px 48px',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div className="landing-hero-grid">
            {/* Left Column: Mission & Search */}
            <div>
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'var(--slate-100)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--navy-900)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}>
                  <ShieldCheck size={14} color="var(--primary)" />
                  <span>Accredited Multi-Tenant Academic Platform</span>
                </span>
              </div>

              <h1 className="hero-title" style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--navy-950)', lineHeight: 1.12, letterSpacing: '-0.03em', marginBottom: 20 }}>
                Unified Learning Infrastructure for <span style={{ color: 'var(--primary)' }}>National Scale</span>
              </h1>

              <p style={{
                fontSize: '1.08rem',
                color: 'var(--slate-600)',
                marginBottom: 28,
                maxWidth: 580,
                lineHeight: 1.65,
              }}>
                EduSphere connects primary schools, high schools, TVET institutes, and national universities into one cohesive, verifiable learning management ecosystem with live classrooms and tamper-evident credentials.
              </p>

              {/* Direct Course Discovery Form */}
              <form onSubmit={handleSearch} className="hero-search-form" style={{ marginBottom: 20 }}>
                <div style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <Search size={18} color="var(--slate-400)" style={{ position: 'absolute', left: 14 }} />
                  <input 
                    type="text" 
                    placeholder="Search by topic, faculty, course code, or syllabus..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{
                      paddingLeft: 42,
                      height: 48,
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.94rem',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                    }}
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="primary"
                  size="md"
                  isLoading={isSearching}
                  style={{ height: 48, padding: '0 24px', borderRadius: 'var(--radius-md)' }}
                >
                  {t.searchBtn}
                </Button>
              </form>

              {/* Primary Call to Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <Button 
                  onClick={() => setCurrentPage('register')}
                  variant="primary"
                  size="md"
                  icon={<ArrowRight size={16} />}
                >
                  Explore as Learner
                </Button>
                <Button 
                  onClick={() => setCurrentPage('institution-register')}
                  variant="secondary"
                  size="md"
                  icon={<Building2 size={16} />}
                >
                  Register Institution
                </Button>
                <button
                  onClick={() => openVerification('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--slate-600)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--slate-600)')}
                >
                  <Lock size={14} />
                  <span>Verify Credential</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                paddingTop: 18,
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                color: 'var(--slate-600)',
                fontWeight: 600,
              }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="var(--primary)" />
                  <span>Strict Data Isolation</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="var(--primary)" />
                  <span>Live WebRTC Classrooms</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} color="var(--primary)" />
                  <span>SHA-256 Verified Certificates</span>
                </div>
              </div>
            </div>

            {/* Right Column: High Quality Realistic Photography */}
            <div>
              <div style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-md)',
                backgroundColor: 'var(--slate-100)',
              }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10' }}>
                  <img 
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80" 
                    alt="University students collaborating in academic session" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 20px',
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.4) 60%, transparent 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                        National Higher Education Network
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                        Addis Ababa University & Regional Partner Campuses
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(4px)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#E2E8F0',
                    }}>
                      Verified Active
                    </div>
                  </div>
                </div>

                {/* Sub-strip with live platform indicators */}
                <div style={{
                  padding: '12px 20px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--slate-600)',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Video size={14} color="var(--primary)" />
                    <span>Live Interactive Rooms Supported</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileCheck2 size={14} color="#10B981" />
                    <span>Instant Anti-Cheating Telemetry</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Architecture: Audience Segments */}
      <section style={{ backgroundColor: 'var(--slate-50)', padding: '40px 24px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', margin: 0 }}>
              Tailored Environments for Every Educational Tier
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem', marginTop: 4 }}>
              Select an academic sector to filter accredited programs, curricula, and institutional portals.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {audienceCategories.map(cat => {
              const isActive = activeAudience === cat.id;
              return (
                <div 
                  key={cat.id}
                  onClick={() => setActiveAudience(activeAudience === cat.id ? 'All' : cat.id)}
                  style={{
                    backgroundColor: isActive ? '#FFFFFF' : '#FFFFFF',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.borderColor = 'var(--slate-400)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <div>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--slate-100)',
                      color: isActive ? '#FFFFFF' : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}>
                      {React.cloneElement(cat.icon, { color: isActive ? '#FFFFFF' : 'var(--primary)' })}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--navy-950)', marginBottom: 6 }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                      {cat.subtext}
                    </div>
                  </div>

                  <div style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--primary)' : 'var(--slate-500)',
                  }}>
                    <span>{isActive ? 'Filtered View Active' : 'Filter by this tier'}</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular & Accredited Courses Section */}
      <CourseCatalog onSelectCourse={openCourse} />

      {/* How Institutional Learning Works: 4 Step Real Architecture */}
      <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em' }}>
              How Sovereign Learning Operates on EduSphere
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.92rem', marginTop: 8 }}>
              From Ministry accreditation to tamper-evident graduation, EduSphere guarantees institutional autonomy and verifiable academic records.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
          }}>
            <div style={{
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '24px',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Step 01
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8 }}>
                Accreditation & Isolation
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', lineHeight: 1.6, margin: 0 }}>
                Schools and universities upload official licenses for Platform Admin verification. Once approved, dedicated tenant barriers guarantee autonomous record management.
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '24px',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Step 02
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8 }}>
                Curriculum Authoring
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', lineHeight: 1.6, margin: 0 }}>
                Instructors publish modular syllabi with video lectures, reading materials, SCORM documents, and graded anti-cheating assessments with custom pass benchmarks.
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '24px',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Step 03
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8 }}>
                Live Interactive Lectures
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', lineHeight: 1.6, margin: 0 }}>
                Integrated low-latency WebRTC stages enable synchronized lectures, live screen sharing, chat discourse, and automatic participant attendance logs.
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '24px',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Step 04
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8 }}>
                Cryptographic Diplomas
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', lineHeight: 1.6, margin: 0 }}>
                Upon syllabus completion, scholars receive verifiable diplomas stamped with SHA-256 hashes, instantly verifiable by employers without login requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Institutions Showcase (Data-driven from api.getTenants) */}
      <section style={{ backgroundColor: 'var(--slate-50)', padding: '56px 24px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Accredited Institutional Partners
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em', margin: 0 }}>
                Higher Education & Certified Academies
              </h2>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCurrentPage('institution-register')}
              icon={<ExternalLink size={14} />}
            >
              Onboard Your Institution
            </Button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {tenants.slice(0, 4).map(tenant => (
              <div 
                key={tenant.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--slate-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--navy-800)',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                    }}>
                      {tenant.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{
                      backgroundColor: tenant.status === 'VERIFIED' ? 'var(--success-light)' : 'var(--slate-100)',
                      color: tenant.status === 'VERIFIED' ? 'var(--success-text)' : 'var(--slate-600)',
                      border: `1px solid ${tenant.status === 'VERIFIED' ? 'var(--success-border)' : 'var(--slate-200)'}`,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}>
                      {tenant.status === 'VERIFIED' ? 'Ministry Accredited' : tenant.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy-950)', marginBottom: 4 }}>
                    {tenant.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: 12 }}>
                    {tenant.type || 'Higher Education Institution'}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><strong>Domain:</strong> {tenant.domains?.[0] || `${tenant.slug}.edusphere.edu`}</div>
                    <div><strong>Contact:</strong> {tenant.contactEmail}</div>
                  </div>
                </div>

                <div style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: 'var(--slate-500)',
                }}>
                  <span>Autonomous Tenant</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Active Syllabus →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Public Credential Verification Gateway (No fake stats, real utility) */}
      <section style={{
        backgroundColor: 'var(--navy-950)',
        color: '#FFFFFF',
        padding: '56px 24px',
        borderTop: '1px solid var(--navy-800)',
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38BDF8',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: 16,
          }}>
            <Lock size={14} />
            <span>Public Tamper-Evident Ledger</span>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.025em', marginBottom: 12 }}>
            Instant Academic Diploma Verification
          </h2>
          <p style={{ color: 'var(--slate-400)', fontSize: '0.94rem', maxWidth: 620, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Employers, ministries, and universities can verify authentic completion diplomas issued by accredited EduSphere institutions without login credentials.
          </p>

          <form onSubmit={handleDirectVerification} style={{
            display: 'flex',
            gap: 12,
            maxWidth: 540,
            margin: '0 auto',
            flexWrap: 'wrap',
          }}>
            <input 
              type="text" 
              placeholder="Enter credential code (e.g. EDU-2026-X89K-4921)" 
              value={verifyCodeInput}
              onChange={e => setVerifyCodeInput(e.target.value)}
              className="input-field"
              style={{
                flex: 1,
                minWidth: 260,
                height: 48,
                backgroundColor: 'var(--navy-900)',
                borderColor: 'var(--navy-700)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
              }}
            />
            <Button 
              type="submit" 
              variant="primary"
              size="md"
              style={{ height: 48, padding: '0 24px', borderRadius: 'var(--radius-md)' }}
            >
              Verify Credential
            </Button>
          </form>

          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: 16 }}>
            Cryptographically signed with SHA-256 hash stamp • Zero private personal data exposed
          </div>
        </div>
      </section>
    </div>
  );
};
