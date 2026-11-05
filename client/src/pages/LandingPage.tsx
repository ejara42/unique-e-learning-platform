import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ICourse } from '../types';
import { 
  Search, 
  School, 
  GraduationCap, 
  Briefcase, 
  UserCheck, 
  Star, 
  ArrowRight,
  Sparkles,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award
} from 'lucide-react';
import { Button, Badge } from '../components/ui';

export const LandingPage: React.FC = () => {
  const { openCourse, setCurrentPage, t } = useApp();
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAudience, setActiveAudience] = useState<string>('All');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    api.getCourses().then(res => setCourses(res.courses));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    api.getCourses({ search: searchTerm })
      .then(res => setCourses(res.courses))
      .finally(() => setIsSearching(false));
  };

  const audienceCategories = [
    { id: 'schools', label: t.schools, subtext: t.schoolsSub, icon: <School size={22} color="var(--primary)" /> },
    { id: 'universities', label: t.universities, subtext: t.universitiesSub, icon: <GraduationCap size={22} color="var(--primary)" /> },
    { id: 'training', label: t.trainingCenters, subtext: t.trainingSub, icon: <Briefcase size={22} color="var(--primary)" /> },
    { id: 'independent', label: t.independentLearners, subtext: t.independentSub, icon: <UserCheck size={22} color="var(--primary)" /> },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <section style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 42%, #EEF2FF 100%)',
        padding: '56px 24px 40px',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -60,
          right: '7%',
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.12) 0%, rgba(79, 70, 229, 0.04) 28%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          left: '8%',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="landing-hero-grid">
            <div>
              <div style={{ marginBottom: 18 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(79, 70, 229, 0.08)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  color: 'var(--primary)',
                  padding: '7px 14px',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  <Sparkles size={14} color="var(--primary)" />
                  <span>{t.heroBadge}</span>
                </span>
              </div>

              <h1 className="hero-title">
                {t.heroTitle} <span style={{ color: 'var(--primary)' }}>{t.heroHighlight}</span>
              </h1>

              <p style={{
                fontSize: '1.12rem',
                color: 'var(--slate-600)',
                marginBottom: 28,
                maxWidth: 600,
                lineHeight: 1.7,
              }}>
                {t.heroSubtitle}
              </p>

              <form onSubmit={handleSearch} className="hero-search-form">
                <div style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: 16 }} />
                  <input 
                    type="text" 
                    placeholder={t.searchPlaceholder} 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{
                      paddingLeft: 46,
                      height: 52,
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '0.96rem',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 8px 24px -16px rgba(79, 70, 229, 0.45)',
                    }}
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="primary"
                  size="md"
                  isLoading={isSearching}
                  style={{ height: 52, padding: '0 28px', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 30px -18px rgba(79, 70, 229, 0.85)' }}
                >
                  {t.searchBtn}
                </Button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Button 
                  onClick={() => setCurrentPage('register')}
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={18} />}
                  style={{ boxShadow: '0 18px 35px -16px rgba(79, 70, 229, 0.7)' }}
                >
                  {t.signUp}
                </Button>
                <Button 
                  onClick={() => setCurrentPage('login')}
                  variant="secondary"
                  size="lg"
                >
                  {t.signIn}
                </Button>
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 22,
                color: 'var(--slate-600)',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}>
                {['12K learners', '320+ programs', '98% completion'].map((item) => (
                  <div key={item} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.75)',
                    border: '1px solid rgba(148,163,184,0.22)',
                    borderRadius: 999,
                    padding: '7px 12px',
                  }}>
                    <CheckCircle2 size={14} color="var(--teal-600)" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{
                borderRadius: 'var(--radius-2xl)',
                overflow: 'hidden',
                boxShadow: '0 32px 40px -20px rgba(15, 23, 42, 0.4)',
                border: '4px solid #FFFFFF',
                position: 'relative',
                transform: 'perspective(1200px) rotateY(-4deg)',
                transition: 'transform 0.3s ease',
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80" 
                  alt="National Virtual Academy" 
                  style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.18) 58%, transparent 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 28,
                }}>
                  <div style={{ color: '#FFFFFF' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, marginBottom: 10 }}>
                      <ShieldCheck size={14} color="#5EEAD4" />
                      <span>Accredited LMS</span>
                    </div>
                    <p style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: 2 }}>National Virtual Academy</p>
                    <p style={{ fontSize: '0.88rem', color: '#CBD5E1' }}>Accredited Higher Education & Continuous Professional Learning</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginTop: 48,
          }}>
            {audienceCategories.map(cat => {
              const isActive = activeAudience === cat.id;
              return (
                <div 
                  key={cat.id}
                  onClick={() => setActiveAudience(cat.id)}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(255,255,255,1))' : '#FFFFFF',
                    borderRadius: 'var(--radius-xl)',
                    padding: '18px 22px',
                    border: isActive ? '2px solid rgba(79, 70, 229, 0.35)' : '1px solid var(--border-color)',
                    boxShadow: isActive ? '0 18px 28px -20px rgba(79, 70, 229, 0.9)' : 'var(--shadow-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    padding: 12,
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: isActive ? 'var(--primary)' : 'var(--primary-light)',
                    color: isActive ? '#FFFFFF' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 12px 20px -14px rgba(79, 70, 229, 0.9)' : 'none',
                  }}>
                    {React.cloneElement(cat.icon, { color: isActive ? '#FFFFFF' : 'var(--primary)' })}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--navy-950)' }}>{cat.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{cat.subtext}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Courses Section */}
      <section style={{ maxWidth: 1240, margin: '48px auto', padding: '0 24px', width: '100%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.025em' }}>
              {t.popularCourses}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 2 }}>
              {t.popularCoursesSub}
            </p>
          </div>
          <button 
            onClick={() => {}} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <span>{t.viewAll}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Courses Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 28,
        }}>
          {courses.map(course => (
            <div 
              key={course.id}
              onClick={() => openCourse(course.id)}
              className="card card-hover"
              style={{
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid rgba(148,163,184,0.24)',
                boxShadow: '0 20px 35px -24px rgba(15, 23, 42, 0.4)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
              }}
            >
              <div style={{ height: 175, position: 'relative', overflow: 'hidden' }}>
                <img 
                  src={course.thumbnailUrl} 
                  alt={course.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }}
                />
                <span style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}>
                  {course.level}
                </span>
              </div>

              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                  }}>
                    {course.category}
                  </div>
                  <h3 style={{
                    fontSize: '1.12rem',
                    fontWeight: 800,
                    color: 'var(--navy-950)',
                    marginBottom: 8,
                    lineHeight: 1.38,
                  }}>
                    {course.title}
                  </h3>
                  <p style={{
                    fontSize: '0.84rem',
                    color: 'var(--text-muted)',
                    marginBottom: 16,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.6,
                  }}>
                    {course.tagline}
                  </p>
                </div>

                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    fontSize: '0.88rem',
                    gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, color: '#D97706' }}>
                      <Star size={16} fill="#F59E0B" color="#F59E0B" />
                      <span>{course.rating.toFixed(1)}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>
                        ({(course.ratingCount / 1000).toFixed(1)}k)
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--teal-700)', fontSize: '1.08rem' }}>
                      {course.price === 0 ? 'Free' : `$${course.price}`}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--navy-850)' }}>{course.institutionName || 'Institution Partner'}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.76rem' }}>Explore →</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof Stats Banner */}
      <section style={{
        backgroundColor: 'var(--navy-950)',
        color: '#FFFFFF',
        padding: '48px 24px',
        borderTop: '1px solid var(--navy-800)',
      }}>
        <div style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 36,
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#60A5FA', letterSpacing: '-0.03em' }}>50,000+</div>
            <div style={{ fontSize: '0.92rem', color: '#CBD5E1', fontWeight: 600, marginTop: 4 }}>{t.activeLearnersCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#34D399', letterSpacing: '-0.03em' }}>1,200+</div>
            <div style={{ fontSize: '0.92rem', color: '#CBD5E1', fontWeight: 600, marginTop: 4 }}>{t.certifiedCoursesCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#A78BFA', letterSpacing: '-0.03em' }}>240+</div>
            <div style={{ fontSize: '0.92rem', color: '#CBD5E1', fontWeight: 600, marginTop: 4 }}>{t.accreditedInstitutionsCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#FBBF24', letterSpacing: '-0.03em' }}>150+</div>
            <div style={{ fontSize: '0.92rem', color: '#CBD5E1', fontWeight: 600, marginTop: 4 }}>{t.expertInstructorsCount}</div>
          </div>
        </div>
      </section>
    </div>
  );
};
