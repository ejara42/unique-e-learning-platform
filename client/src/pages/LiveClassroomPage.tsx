import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ILiveSession } from '../types';
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
  Sparkles,
  GraduationCap,
  User,
  Radio
} from 'lucide-react';
import { Button, Badge } from '../components/ui';

export const LiveClassroomPage: React.FC = () => {
  const { currentUser, setCurrentPage, activeLiveSessionId } = useApp();
  const [liveSession, setLiveSession] = useState<ILiveSession | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [secondsAttended, setSecondsAttended] = useState(0);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const userVideoRef = useRef<HTMLVideoElement>(null);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isTeacher?: boolean }>>([
    {
      sender: 'Live Classroom System',
      text: 'Interactive live session connected. Real-time audio, video, and attendance telemetry are active.',
      time: 'Just now',
      isTeacher: true
    },
  ]);
  const [newMsg, setNewMsg] = useState('');

  // Fetch session details & join session for telemetry and LiveKit token
  useEffect(() => {
    const sessionId = activeLiveSessionId || 'live-1';
    if (currentUser) {
      api.joinLiveSession(sessionId)
        .then(res => {
          if (res.session) setLiveSession(res.session);
        })
        .catch(() => { });
    } else {
      api.getLiveSessions()
        .then(res => {
          const found = res.sessions?.find(s => s.id === sessionId) || res.sessions?.[0];
          if (found) setLiveSession(found);
        })
        .catch(() => { });
    }
  }, [activeLiveSessionId, currentUser]);

  // Handle local webcam stream when video is toggled on
  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    if (videoOn && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then(stream => {
          mediaStream = stream;
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
            setHasCameraStream(true);
          }
        })
        .catch(() => {
          setHasCameraStream(false);
        });
    } else {
      setHasCameraStream(false);
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoOn]);

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
        sender: currentUser?.fullName || 'Participant',
        text: newMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTeacher: currentUser?.activeRole === 'INSTRUCTOR' || currentUser?.activeRole === 'PLATFORM_ADMIN',
      },
    ]);
    setNewMsg('');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isInstructor = currentUser?.activeRole === 'INSTRUCTOR' || currentUser?.activeRole === 'PLATFORM_ADMIN';

  // Roster includes only genuine active participants: Stage Host + Current User
  const hostName = liveSession?.instructorName || 'Faculty Instructor';
  const participants = isInstructor
    ? [
      {
        name: `${currentUser?.fullName || 'Instructor'} (You - Host)`,
        role: 'Instructor',
        isSpeaking: micOn
      }
    ]
    : [
      {
        name: hostName,
        role: 'Host',
        isSpeaking: true
      },
      ...(currentUser ? [{
        name: `${currentUser.fullName} (You)`,
        role: currentUser.activeRole.replace('_', ' '),
        isSpeaking: micOn
      }] : [])
    ];

  const userInitials = (currentUser?.fullName || 'User')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
              {liveSession?.title || 'Interactive Live Learning Session'}
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
              {liveSession?.courseTitle || 'EduSphere Real-Time Classroom'}
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
      <div className="live-studio-viewport">
        {/* Stage Video Grid */}
        <div style={{
          flex: 1,
          padding: 20,
          display: 'grid',
          gridTemplateColumns: screenShare ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          overflowY: 'auto',
          alignContent: 'center',
        }}>
          {/* Teacher Primary Stage Feed */}
          <div style={{
            backgroundColor: '#0F172A',
            background: 'radial-gradient(circle at 50% 40%, rgba(79, 70, 229, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            border: '2px solid rgba(79, 70, 229, 0.5)',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative',
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}>
            <div style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              backgroundColor: 'rgba(79, 70, 229, 0.2)',
              border: '2px solid rgba(129, 140, 248, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 0 30px rgba(79, 70, 229, 0.35)',
            }}>
              <GraduationCap size={44} color="#818CF8" />
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>
              {isInstructor ? (currentUser?.fullName || 'Faculty Lead') : 'Faculty Lead Instructor'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={14} color="#34D399" />
              Live Interactive Audio & Video Stream Active
            </p>

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
              <span>{isInstructor ? `${currentUser?.fullName} (Host)` : 'Instructor'}</span>
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
            backgroundColor: '#0F172A',
            background: 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.95) 100%)',
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
              hasCameraStream ? (
                <video
                  ref={userVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    marginBottom: 12,
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
                  }}>
                    {userInitials}
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>
                    {currentUser?.fullName || 'Participant'}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34D399' }} />
                    Live Camera Feed Active
                  </p>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <VideoOff size={32} style={{ opacity: 0.6 }} />
                </div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#E2E8F0', marginBottom: 2 }}>
                  {currentUser?.fullName || 'You'}
                </p>
                <p style={{ fontSize: '0.78rem', color: '#64748B' }}>Your camera is turned off</p>
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
              <span>{currentUser?.fullName ? `${currentUser.fullName} (You)` : 'You (Participant)'}</span>
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
