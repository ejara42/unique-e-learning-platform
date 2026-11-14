import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { ILiveSession } from '../types';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Hand,
  MessageSquare,
  Users,
  PhoneOff,
  Send,
  ShieldCheck,
  Clock,
  Volume2,
  GraduationCap,
  Radio,
  Wifi,
  WifiOff,
  Disc,
  Square,
  LayoutGrid,
  Maximize2,
  X,
  AlertTriangle,
  UserX,
  VolumeX,
} from 'lucide-react';
import { Button, Badge } from '../components/ui';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface ChatMsg {
  sender: string;
  text: string;
  time: string;
  isTeacher?: boolean;
}

type NetworkQuality = 'excellent' | 'good' | 'poor';
type LayoutMode = 'gallery' | 'spotlight';

const REACTIONS = ['👍', '👏', '❤️', '😄', '🎉'] as const;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatTimer(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Animated speaking-ring avatar */
const SpeakerAvatar: React.FC<{
  initials: string;
  isSpeaking: boolean;
  size?: number;
  color?: string;
}> = ({ initials, isSpeaking, size = 72, color = '#3B82F6' }) => (
  <div
    style={{
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0,
    }}
  >
    {isSpeaking && (
      <div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          animation: 'speakRing 1.2s ease-in-out infinite',
          opacity: 0.7,
        }}
      />
    )}
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: `${color}22`,
        border: `2px solid ${color}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.3,
        fontWeight: 800,
        color: '#FFFFFF',
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </div>
  </div>
);

/** Floating reaction emoji */
const FloatReaction: React.FC<{ emoji: string; id: number; onDone: (id: number) => void }> = ({
  emoji,
  id,
  onDone,
}) => {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), 2600);
    return () => clearTimeout(t);
  }, [id, onDone]);

  return (
    <div
      key={id}
      style={{
        position: 'fixed',
        bottom: 100,
        left: `${20 + Math.random() * 60}%`,
        fontSize: '2rem',
        animation: 'floatUp 2.6s ease-out forwards',
        pointerEvents: 'none',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      {emoji}
    </div>
  );
};

/** Network quality pill */
const NetworkBadge: React.FC<{ quality: NetworkQuality }> = ({ quality }) => {
  const cfg: Record<NetworkQuality, { label: string; color: string; icon: React.ReactNode }> = {
    excellent: { label: 'Excellent', color: '#34D399', icon: <Wifi size={13} /> },
    good: { label: 'Good', color: '#FCD34D', icon: <Wifi size={13} /> },
    poor: { label: 'Poor', color: '#F87171', icon: <WifiOff size={13} /> },
  };
  const { label, color, icon } = cfg[quality];
  return (
    <div
      title={`Network quality: ${label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.08)',
        border: `1px solid ${color}44`,
        color,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: '0.76rem',
        fontWeight: 700,
        cursor: 'default',
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
};

/** Control button with tooltip label */
const CtrlBtn: React.FC<{
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  children: React.ReactNode;
  badge?: number;
}> = ({ onClick, active, danger, label, children, badge }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: 48,
        height: 48,
        borderRadius: '50%',
        backgroundColor: danger
          ? '#EF4444'
          : active
          ? 'rgba(255,255,255,0.18)'
          : 'rgba(255,255,255,0.09)',
        border: active && !danger ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.15s, transform 0.1s',
        outline: 'none',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)')}
      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
      title={label}
    >
      {children}
      {badge != null && badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: '#EF4444',
            color: '#FFF',
            fontSize: '0.6rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #0F172A',
          }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
    <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  </div>
);

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export const LiveClassroomPage: React.FC = () => {
  const { currentUser, setCurrentPage, activeLiveSessionId } = useApp();

  /* Media / session state */
  const [liveSession, setLiveSession] = useState<ILiveSession | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasCameraStream, setHasCameraStream] = useState(false);
  const userVideoRef = useRef<HTMLVideoElement>(null);

  /* UI state */
  const [chatOpen, setChatOpen] = useState(true);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('gallery');
  const [networkQuality] = useState<NetworkQuality>('excellent');
  const [secondsAttended, setSecondsAttended] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  /* Reactions */
  const [reactions, setReactions] = useState<{ emoji: string; id: number }[]>([]);
  const reactionCounter = useRef(0);

  /* Chat */
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      sender: 'Live Classroom System',
      text: 'Interactive live session connected. Real-time audio, video, and attendance telemetry are active.',
      time: 'Just now',
      isTeacher: true,
    },
  ]);
  const [newMsg, setNewMsg] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Fetch session ── */
  useEffect(() => {
    const sessionId = activeLiveSessionId || 'live-1';
    if (currentUser) {
      api
        .joinLiveSession(sessionId)
        .then(res => {
          if (res.session) setLiveSession(res.session);
        })
        .catch(() => {});
    } else {
      api
        .getLiveSessions()
        .then(res => {
          const found =
            res.sessions?.find((s: ILiveSession) => s.id === sessionId) || res.sessions?.[0];
          if (found) setLiveSession(found);
        })
        .catch(() => {});
    }
  }, [activeLiveSessionId, currentUser]);

  /* ── Camera stream ── */
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (videoOn && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then(s => {
          stream = s;
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = s;
            setHasCameraStream(true);
          }
        })
        .catch(() => setHasCameraStream(false));
    } else {
      setHasCameraStream(false);
    }
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [videoOn]);

  /* ── Attendance timer ── */
  useEffect(() => {
    const t = setInterval(() => setSecondsAttended(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Recording timer ── */
  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecordingSeconds(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!chatOpen) setUnreadChat(p => p + 1);
  }, [chatMessages]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'm' || e.key === 'M') setMicOn(p => !p);
      if (e.key === 'v' || e.key === 'V') setVideoOn(p => !p);
      if (e.key === 'c' || e.key === 'C') {
        setChatOpen(p => {
          if (!p) setUnreadChat(0);
          return !p;
        });
        setRosterOpen(false);
      }
      if (e.key === 'Escape') setShowEndConfirm(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── Helpers ── */
  const isInstructor =
    currentUser?.activeRole === 'INSTRUCTOR' || currentUser?.activeRole === 'PLATFORM_ADMIN';

  const userInitials = (currentUser?.fullName || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const hostName = liveSession?.instructorName || 'Faculty Instructor';

  const participants = isInstructor
    ? [{ name: `${currentUser?.fullName || 'Instructor'} (You · Host)`, role: 'Instructor', isSpeaking: micOn, handRaised: false }]
    : [
        { name: hostName, role: 'Host', isSpeaking: true, handRaised: false },
        ...(currentUser
          ? [{ name: `${currentUser.fullName} (You)`, role: currentUser.activeRole.replace('_', ' '), isSpeaking: micOn, handRaised }]
          : []),
      ];

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMsg.trim()) return;
      setChatMessages(prev => [
        ...prev,
        {
          sender: currentUser?.fullName || 'Participant',
          text: newMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isTeacher: isInstructor,
        },
      ]);
      setNewMsg('');
    },
    [newMsg, currentUser, isInstructor],
  );

  const handleToggleRecording = async () => {
    const next = !isRecording;
    setIsRecording(next);
    if (!next) setRecordingSeconds(0);
    if (liveSession?.id) {
      try {
        await api.toggleRecording(liveSession.id, next ? 'START' : 'STOP');
      } catch {
        /* non-fatal */
      }
    }
  };

  const fireReaction = (emoji: string) => {
    const id = ++reactionCounter.current;
    setReactions(p => [...p, { emoji, id }]);
  };

  const removeReaction = useCallback((id: number) => {
    setReactions(p => p.filter(r => r.id !== id));
  }, []);

  const openChat = () => {
    setChatOpen(true);
    setRosterOpen(false);
    setUnreadChat(0);
  };

  const openRoster = () => {
    setRosterOpen(true);
    setChatOpen(false);
  };

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: '#070E1A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
      }}
    >
      {/* ── Global keyframe styles ── */}
      <style>{`
        @keyframes speakRing {
          0%,100% { transform: scale(1); opacity:0.7; }
          50% { transform: scale(1.18); opacity:0.3; }
        }
        @keyframes recordPulse {
          0%,100% { opacity:1; }
          50% { opacity:0.3; }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity:1; }
          80% { opacity:0.8; }
          100% { transform: translateY(-160px) scale(1.4); opacity:0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .live-ctrl-bar button:focus-visible {
          outline: 2px solid #60A5FA;
          outline-offset: 2px;
        }
      `}</style>

      {/* ── Floating Reactions ── */}
      {reactions.map(r => (
        <FloatReaction key={r.id} emoji={r.emoji} id={r.id} onDone={removeReaction} />
      ))}

      {/* ── End Session Confirm Modal ── */}
      {showEndConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: '32px 28px',
              maxWidth: 380,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={26} color="#F87171" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>
              {isInstructor ? 'End Live Session?' : 'Leave Session?'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: 24, lineHeight: 1.5 }}>
              {isInstructor
                ? 'This will end the session for all participants and stop the recording.'
                : 'Your attendance will be logged. You can rejoin if the session is still active.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.07)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentPage(isInstructor ? 'teacher-studio' : 'learner-dashboard')}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                {isInstructor ? 'End for All' : 'Leave Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0A1628',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Left: LIVE badge + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(239,68,68,0.15)',
              color: '#F87171',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                animation: 'recordPulse 1.5s infinite',
              }}
            />
            LIVE
          </div>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {liveSession?.title || 'Interactive Live Learning Session'}
            </h2>
            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
              {liveSession?.courseTitle || 'EduSphere Real-Time Classroom'}
            </div>
          </div>
        </div>

        {/* Centre: status pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isRecording && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#F87171',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              <Disc size={12} style={{ animation: 'recordPulse 1s infinite' }} />
              REC {formatTimer(recordingSeconds)}
            </div>
          )}

          <NetworkBadge quality={networkQuality} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(255,255,255,0.07)',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: '0.74rem',
              color: '#94A3B8',
              fontWeight: 600,
            }}
          >
            <Clock size={12} color="#5EEAD4" />
            {formatTimer(secondsAttended)}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(255,255,255,0.07)',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: '0.74rem',
              color: '#94A3B8',
              fontWeight: 600,
            }}
          >
            <Users size={12} color="#94A3B8" />
            {participants.length}
          </div>
        </div>

        {/* Right: layout + leave */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setLayoutMode(p => (p === 'gallery' ? 'spotlight' : 'gallery'))}
            title={layoutMode === 'gallery' ? 'Switch to Spotlight' : 'Switch to Gallery'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              backgroundColor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94A3B8',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {layoutMode === 'gallery' ? <Maximize2 size={14} /> : <LayoutGrid size={14} />}
            {layoutMode === 'gallery' ? 'Spotlight' : 'Gallery'}
          </button>

          <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#EF4444',
              border: 'none',
              color: '#FFFFFF',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <PhoneOff size={14} />
            Leave
          </button>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Video Grid ── */}
        <div
          style={{
            flex: 1,
            padding: 16,
            display: 'grid',
            gridTemplateColumns:
              layoutMode === 'spotlight' || screenShare
                ? '1fr'
                : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 14,
            overflowY: 'auto',
            alignContent: 'start',
          }}
        >
          {/* Screen share overlay banner */}
          {screenShare && (
            <div
              style={{
                gridColumn: '1/-1',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.35)',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: '0.82rem',
                color: '#93C5FD',
                fontWeight: 700,
              }}
            >
              <ScreenShare size={16} />
              You are sharing your screen — click "Screen" in the controls to stop.
            </div>
          )}

          {/* ── Instructor / Host tile ── */}
          <div
            style={{
              backgroundColor: '#0C1A2E',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              position: 'relative',
              minHeight: layoutMode === 'spotlight' ? 420 : 280,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <SpeakerAvatar initials={isInstructor ? userInitials : (hostName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase())} isSpeaking size={80} color="#3B82F6" />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                {isInstructor ? currentUser?.fullName || 'Faculty Lead' : hostName}
              </div>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: '#34D399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                <Radio size={11} /> Live Audio & Video Stream
              </div>
            </div>

            {/* Stage Host badge */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                backgroundColor: 'var(--primary, #3B82F6)',
                color: '#FFF',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
              }}
            >
              STAGE HOST
            </div>

            {/* Name label */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                backgroundColor: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Volume2 size={12} color="#34D399" />
              {isInstructor ? `${currentUser?.fullName || 'Instructor'} (Host)` : 'Instructor'}
            </div>
          </div>

          {/* ── User / Self tile ── */}
          {!isInstructor && (
            <div
              style={{
                backgroundColor: '#0C1A2E',
                borderRadius: 14,
                overflow: 'hidden',
                border: `1px solid ${handRaised ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.09)'}`,
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                position: 'relative',
                minHeight: 280,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {videoOn ? (
                hasCameraStream ? (
                  <video
                    ref={userVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                  />
                ) : (
                  <SpeakerAvatar initials={userInitials} isSpeaking={micOn} size={72} color="#6366F1" />
                )
              ) : (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VideoOff size={30} style={{ opacity: 0.5 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{currentUser?.fullName || 'You'}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Camera off</div>
                  </div>
                </div>
              )}

              {/* Mic / name label */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {micOn ? <Mic size={12} color="#34D399" /> : <MicOff size={12} color="#EF4444" />}
                {currentUser ? `${currentUser.fullName} (You)` : 'You (Participant)'}
              </div>

              {/* Hand-raised indicator */}
              {handRaised && (
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    backgroundColor: 'rgba(245,158,11,0.9)',
                    color: '#FFF',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                  }}
                >
                  ✋ Hand Raised
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Panel: Chat / Roster ── */}
        {(chatOpen || rosterOpen) && (
          <aside
            style={{
              width: 320,
              backgroundColor: '#0A1628',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Panel tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { label: 'Chat', count: chatMessages.length, active: chatOpen, onClick: openChat, icon: <MessageSquare size={14} /> },
                { label: 'Roster', count: participants.length, active: rosterOpen, onClick: openRoster, icon: <Users size={14} /> },
              ].map(tab => (
                <button
                  key={tab.label}
                  onClick={tab.onClick}
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: tab.active ? '2px solid #3B82F6' : '2px solid transparent',
                    color: tab.active ? '#FFFFFF' : '#64748B',
                    fontWeight: tab.active ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'color 0.15s',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  <span
                    style={{
                      backgroundColor: tab.active ? '#3B82F6' : 'rgba(255,255,255,0.12)',
                      color: '#FFF',
                      borderRadius: 20,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}

              {/* Close panel */}
              <button
                onClick={() => { setChatOpen(false); setRosterOpen(false); }}
                style={{ padding: '0 10px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                title="Close panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Chat body ── */}
            {chatOpen && (
              <>
                <div
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: m.isTeacher
                          ? 'rgba(99,102,241,0.14)'
                          : 'rgba(255,255,255,0.05)',
                        border: m.isTeacher
                          ? '1px solid rgba(99,102,241,0.3)'
                          : '1px solid rgba(255,255,255,0.07)',
                        padding: '8px 10px',
                        borderRadius: 10,
                        fontSize: '0.83rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: m.isTeacher ? '#A5B4FC' : '#CBD5E1',
                            fontSize: '0.76rem',
                          }}
                        >
                          {m.sender}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#475569' }}>{m.time}</span>
                      </div>
                      <div style={{ color: '#E2E8F0', lineHeight: 1.45 }}>{m.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '10px 12px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Send a message…"
                    className="input-field"
                    style={{
                      height: 36,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.83rem',
                      flex: 1,
                    }}
                  />
                  <Button type="submit" variant="primary" size="sm" style={{ padding: '0 12px' }}>
                    <Send size={14} />
                  </Button>
                </form>
              </>
            )}

            {/* ── Roster body ── */}
            {rosterOpen && (
              <div
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Hands raised section */}
                {participants.some(p => p.handRaised) && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 6 }}>
                      ✋ HANDS RAISED
                    </div>
                    {participants.filter(p => p.handRaised).map((p, i) => (
                      <div key={i} style={{ padding: '6px 10px', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: '0.83rem', fontWeight: 700, color: '#FCD34D' }}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* All participants */}
                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>
                  ALL PARTICIPANTS ({participants.length})
                </div>
                {participants.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: 10,
                      fontSize: '0.83rem',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {p.handRaised ? '✋ ' : ''}{p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'capitalize' }}>{p.role}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.isSpeaking && (
                        <span style={{ fontSize: '0.68rem', color: '#34D399', fontWeight: 700 }}>● Live</span>
                      )}
                      {/* Instructor-only: kick/mute individual */}
                      {isInstructor && !p.name.includes('(You') && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button title="Mute" style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }}>
                            <VolumeX size={13} />
                          </button>
                          <button title="Remove" style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }}>
                            <UserX size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Instructor: Mute All */}
                {isInstructor && (
                  <button
                    style={{
                      marginTop: 8,
                      padding: '8px 0',
                      borderRadius: 8,
                      border: '1px solid rgba(239,68,68,0.3)',
                      backgroundColor: 'rgba(239,68,68,0.08)',
                      color: '#F87171',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <VolumeX size={14} /> Mute All Participants
                  </button>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ══ REACTIONS BAR ═══════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          padding: '6px 0',
          backgroundColor: '#070E1A',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => fireReaction(emoji)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.3rem',
              cursor: 'pointer',
              borderRadius: 8,
              padding: '2px 6px',
              transition: 'transform 0.1s',
              lineHeight: 1,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.3)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ══ BOTTOM CONTROL BAR ══════════════════════════════════════════════ */}
      <footer
        className="live-ctrl-bar"
        style={{
          padding: '12px 24px',
          backgroundColor: '#0A1628',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 20,
          flexShrink: 0,
        }}
      >
        <CtrlBtn onClick={() => setMicOn(p => !p)} active={micOn} label={micOn ? 'Mute (M)' : 'Unmute (M)'}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} color="#F87171" />}
        </CtrlBtn>

        <CtrlBtn onClick={() => setVideoOn(p => !p)} active={videoOn} label={videoOn ? 'Stop Cam (V)' : 'Start Cam (V)'}>
          {videoOn ? <Video size={20} /> : <VideoOff size={20} color="#F87171" />}
        </CtrlBtn>

        <CtrlBtn onClick={() => setScreenShare(p => !p)} active={screenShare} label={screenShare ? 'Stop Share' : 'Share Screen'}>
          {screenShare ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
        </CtrlBtn>

        <CtrlBtn onClick={() => setHandRaised(p => !p)} active={handRaised} label={handRaised ? 'Lower Hand' : 'Raise Hand'}>
          <Hand size={20} color={handRaised ? '#FCD34D' : undefined} />
        </CtrlBtn>

        <CtrlBtn
          onClick={() => { openChat(); if (!chatOpen) setUnreadChat(0); }}
          active={chatOpen}
          label="Chat (C)"
          badge={!chatOpen ? unreadChat : 0}
        >
          <MessageSquare size={20} />
        </CtrlBtn>

        <CtrlBtn onClick={openRoster} active={rosterOpen} label="Participants">
          <Users size={20} />
        </CtrlBtn>

        {/* Recording — instructor-only */}
        {isInstructor && (
          <CtrlBtn
            onClick={handleToggleRecording}
            active={isRecording}
            label={isRecording ? 'Stop REC' : 'Record'}
          >
            {isRecording ? (
              <Square size={18} fill="#F87171" color="#F87171" />
            ) : (
              <Disc size={20} />
            )}
          </CtrlBtn>
        )}

        {/* Security indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="End-to-end encrypted session"
          >
            <ShieldCheck size={20} color="#34D399" />
          </div>
          <span style={{ fontSize: '0.65rem', color: '#34D399', fontWeight: 600 }}>E2E Enc.</span>
        </div>
      </footer>
    </div>
  );
};
