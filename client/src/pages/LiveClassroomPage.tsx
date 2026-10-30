import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ScreenShare, 
  Hand, 
  MessageSquare, 
  Users, 
  PhoneOff, 
  Disc, 
  Send,
  ShieldCheck,
  Clock,
  Volume2,
  Sparkles
} from 'lucide-react';
import { Button, Badge } from '../components/ui';

export const LiveClassroomPage: React.FC = () => {
  const { currentUser, setCurrentPage } = useApp();
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [secondsAttended, setSecondsAttended] = useState(720); // 12 mins

  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isTeacher?: boolean }>>([
    { sender: 'Faculty Lead (Instructor)', text: 'Welcome to today’s interactive live session! Please feel free to raise hand or ask questions in chat.', time: '14:02', isTeacher: true },
    { sender: 'Academic Moderator', text: 'Attendance telemetry and live session recording are active.', time: '14:03', isTeacher: true },
  ]);
  const [newMsg, setNewMsg] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAttended(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages([
      ...chatMessages,
      {
        sender: currentUser?.fullName || 'Student Participant',
        text: newMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTeacher: currentUser?.activeRole === 'INSTRUCTOR',
      },
    ]);
    setNewMsg('');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const participants = [
    { name: 'Faculty Lead (Instructor)', role: 'Instructor (Host)', isSpeaking: true },
    ...(currentUser ? [{ name: `${currentUser.fullName} (You)`, role: currentUser.activeRole.replace('_', ' '), isSpeaking: false }] : []),
    { name: 'Abebe Kebede', role: 'Student Participant', isSpeaking: false },
    { name: 'Sara Tesfaye', role: 'Student Participant', isSpeaking: false },
  ];

  return (
    <div style={{
      height: '100vh',
      backgroundColor: 'var(--navy-950)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top Classroom Bar */}
      <header style={{
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--navy-900)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: '#EF4444',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            fontWeight: 800,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EF4444', animation: 'recordingPulse 1.5s infinite' }} />
            LIVE
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Live Coding Lab: Python Functions & Recursion
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              Introduction to Programming • Apex University & EduSphere Network
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Attendance Timer Telemetry */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: '0.82rem',
            color: '#E2E8F0',
            fontWeight: 600,
          }}>
            <Clock size={15} color="#5EEAD4" />
            <span>Attendance Telemetry: {formatTimer(secondsAttended)}</span>
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={() => setCurrentPage('learner-dashboard')}
            icon={<PhoneOff size={15} />}
          >
            Leave Session
          </Button>
        </div>
      </header>

      {/* Main Studio Viewport */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Stage Video Grid */}
        <div style={{
          flex: 1,
          padding: 20,
          display: 'grid',
          gridTemplateColumns: screenShare ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
          overflowY: 'auto',
          alignContent: 'center',
        }}>
          {/* Teacher Primary Feed */}
          <div style={{
            backgroundColor: 'var(--navy-900)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            border: '2px solid rgba(79, 70, 229, 0.4)',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative',
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" 
              alt="Faculty Lead" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(4px)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Volume2 size={15} color="#34D399" />
              <span>Dr. Almaz Bekele (Faculty Instructor)</span>
            </div>
            <div style={{
              position: 'absolute',
              top: 14,
              right: 14,
              backgroundColor: 'rgba(79, 70, 229, 0.9)',
              color: '#FFFFFF',
              padding: '3px 10px',
              borderRadius: 4,
              fontSize: '0.72rem',
              fontWeight: 800,
            }}>
              STAGE HOST
            </div>
          </div>

          {/* User Participant Feed */}
          <div style={{
            backgroundColor: 'var(--navy-900)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'relative',
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {videoOn ? (
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80" 
                alt="Your Feed" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                <VideoOff size={44} style={{ marginBottom: 10, opacity: 0.6 }} />
                <p style={{ fontSize: '0.88rem' }}>Your camera is turned off</p>
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(4px)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              {micOn ? <Mic size={14} color="#34D399" /> : <MicOff size={14} color="#EF4444" />}
              <span>{currentUser?.fullName || 'You (Participant)'}</span>
            </div>
          </div>
        </div>

        {/* Right Collapsible Panel: Chat & Roster */}
        {(chatOpen || rosterOpen) && (
          <aside style={{
            width: 320,
            backgroundColor: 'var(--navy-900)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Panel Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <button
                onClick={() => { setChatOpen(true); setRosterOpen(false); }}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: chatOpen ? '2px solid var(--primary)' : '2px solid transparent',
                  color: chatOpen ? '#FFFFFF' : '#94A3B8',
                  fontWeight: chatOpen ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MessageSquare size={16} /> Chat ({chatMessages.length})
              </button>

              <button
                onClick={() => { setRosterOpen(true); setChatOpen(false); }}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: rosterOpen ? '2px solid var(--primary)' : '2px solid transparent',
                  color: rosterOpen ? '#FFFFFF' : '#94A3B8',
                  fontWeight: rosterOpen ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Users size={16} /> Roster ({participants.length})
              </button>
            </div>

            {/* Chat Body */}
            {chatOpen && (
              <>
                <div style={{
                  flex: 1,
                  padding: 16,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  {chatMessages.map((m, idx) => (
                    <div key={idx} style={{
                      backgroundColor: m.isTeacher ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      border: m.isTeacher ? '1px solid rgba(79, 70, 229, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: 10,
                      borderRadius: 8,
                      fontSize: '0.85rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: m.isTeacher ? '#A5B4FC' : '#CBD5E1', fontSize: '0.8rem' }}>
                          {m.sender}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{m.time}</span>
                      </div>
                      <div style={{ color: '#F1F5F9', lineHeight: 1.4 }}>{m.text}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} style={{
                  padding: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  gap: 8,
                }}>
                  <input 
                    type="text" 
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="input-field"
                    style={{
                      height: 38,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                    }}
                  />
                  <Button type="submit" variant="primary" size="sm" style={{ padding: '0 14px' }}>
                    <Send size={15} />
                  </Button>
                </form>
              </>
            )}

            {/* Roster Body */}
            {rosterOpen && (
              <div style={{
                flex: 1,
                padding: 16,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                {participants.map((p, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{p.name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{p.role}</div>
                    </div>
                    {p.isSpeaking && (
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700 }}>Speaking</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <footer style={{
        padding: '14px 24px',
        backgroundColor: 'var(--navy-900)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
      }}>
        <button
          onClick={() => setMicOn(!micOn)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: micOn ? 'rgba(255, 255, 255, 0.12)' : '#EF4444',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={() => setVideoOn(!videoOn)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: videoOn ? 'rgba(255, 255, 255, 0.12)' : '#EF4444',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={videoOn ? 'Stop Camera' : 'Start Camera'}
        >
          {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          onClick={() => setScreenShare(!screenShare)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: screenShare ? 'var(--primary)' : 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Toggle Screen Share"
        >
          <ScreenShare size={20} />
        </button>

        <button
          onClick={() => setHandRaised(!handRaised)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: handRaised ? '#F59E0B' : 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Raise Hand"
        >
          <Hand size={20} />
        </button>

        <button
          onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) setRosterOpen(false); }}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: chatOpen ? 'var(--primary)' : 'rgba(255, 255, 255, 0.12)',
            border: 'none',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Toggle Chat"
        >
          <MessageSquare size={20} />
        </button>
      </footer>
    </div>
  );
};
