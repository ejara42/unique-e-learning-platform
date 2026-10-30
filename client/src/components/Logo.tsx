import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Camera, Upload, RotateCcw, X, Check, Image as ImageIcon } from 'lucide-react';

interface LogoProps {
  size?: number;
  rounded?: boolean;
  style?: React.CSSProperties;
  className?: string;
  src?: string;
  editable?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 36,
  rounded = true,
  style,
  className,
  src,
  editable = false,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const updateFavicon = (iconUrl: string) => {
    try {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = iconUrl;
      }
    } catch {
      // ignore
    }
  };

  const loadActiveLogo = () => {
    // 1. Explicit prop src
    if (src) {
      setCurrentSrc(src);
      setImageFailed(false);
      return;
    }

    // 2. Custom picture uploaded by user saved in localStorage
    const saved = localStorage.getItem('edusphere_custom_logo');
    if (saved) {
      setCurrentSrc(saved);
      setImageFailed(false);
      updateFavicon(saved);
      return;
    }

    // 3. Look for custom public picture /logo.png, /logo.svg
    setCurrentSrc('/logo.png');
    setImageFailed(false);
  };

  useEffect(() => {
    loadActiveLogo();

    // Listen for cross-component logo updates
    const handleUpdate = () => {
      loadActiveLogo();
    };

    window.addEventListener('edusphere_logo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const handleOpenModal = () => {
      if (editable) {
        setShowModal(true);
      }
    };
    window.addEventListener('edusphere_open_logo_modal', handleOpenModal);

    return () => {
      window.removeEventListener('edusphere_logo_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('edusphere_open_logo_modal', handleOpenModal);
    };
  }, [src, editable]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setToastMessage('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPreviewSrc(result);
        if (!showModal) {
          // Direct apply if triggered from quick click
          localStorage.setItem('edusphere_custom_logo', result);
          setCurrentSrc(result);
          setImageFailed(false);
          updateFavicon(result);
          window.dispatchEvent(new CustomEvent('edusphere_logo_updated', { detail: result }));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleApplyPreview = () => {
    if (previewSrc) {
      localStorage.setItem('edusphere_custom_logo', previewSrc);
      setCurrentSrc(previewSrc);
      setImageFailed(false);
      updateFavicon(previewSrc);
      window.dispatchEvent(new CustomEvent('edusphere_logo_updated', { detail: previewSrc }));
      setShowModal(false);
      setPreviewSrc(null);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('edusphere_custom_logo');
    setCurrentSrc('/logo.svg');
    setImageFailed(false);
    setPreviewSrc(null);
    updateFavicon('/logo.svg');
    window.dispatchEvent(new CustomEvent('edusphere_logo_updated', { detail: null }));
    setShowModal(false);
  };

  const borderRadius = rounded ? Math.max(6, Math.floor(size * 0.22)) : 0;

  return (
    <>
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            zIndex: 1200,
            backgroundColor: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '0.8rem',
            fontWeight: 700,
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)',
          }}
        >
          {toastMessage}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: editable ? 'pointer' : 'default',
          flexShrink: 0,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (editable) {
            setShowModal(true);
          }
        }}
        title={editable ? 'Click to replace logo with your own picture' : 'EduSphere Logo'}
      >
        {!imageFailed && currentSrc ? (
          <img
            src={currentSrc}
            alt="EduSphere Logo"
            onError={() => {
              if (currentSrc === '/logo.png') {
                setCurrentSrc('/logo.svg');
              } else {
                setImageFailed(true);
              }
            }}
            style={{
              width: size,
              height: size,
              objectFit: 'contain',
              borderRadius: borderRadius,
              display: 'block',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              background: '#FFFFFF',
              ...style,
            }}
            className={className}
          />
        ) : (
          <div
            style={{
              width: size,
              height: size,
              background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
              color: '#FFFFFF',
              borderRadius: rounded ? Math.max(6, Math.floor(size * 0.25)) : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              ...style,
            }}
            className={className}
          >
            <GraduationCap size={Math.floor(size * 0.6)} color="#FFFFFF" />
          </div>
        )}

        {/* Hover Camera Overlay if Editable */}
        {editable && isHovered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              borderRadius: borderRadius,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              backdropFilter: 'blur(2px)',
              transition: 'all 0.2s ease',
            }}
          >
            <Camera size={Math.max(14, Math.floor(size * 0.42))} />
          </div>
        )}

        {/* Hidden File Input for quick replace */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>

      {/* Modal to Replace Logo With Own Picture */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setPreviewSrc(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'modalSlideIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  padding: 8,
                  borderRadius: 10,
                  backgroundColor: '#EFF6FF',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                    Replace EduSphere Logo
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Upload your own picture or custom brand emblem
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPreviewSrc(null);
                }}
                className="btn-ghost"
                style={{ padding: 6, borderRadius: 8, color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drag & Drop Preview Box */}
            <div 
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  processImageFile(file);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC',
                border: isDragging ? '2px dashed var(--primary)' : '2px dashed #CBD5E1',
                borderRadius: 12,
                padding: '24px 16px',
                marginBottom: 20,
                gap: 12,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 96,
                height: 96,
                borderRadius: 18,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : !imageFailed && currentSrc ? (
                  <img
                    src={currentSrc}
                    alt="Current Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <GraduationCap size={48} color="#2563EB" />
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  {previewSrc ? 'New Picture Selected (Ready to Apply)' : 'Drag & drop your picture here or click below'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                  Supports PNG, JPG, SVG, WebP (Square recommended)
                </p>
              </div>

              <input
                type="file"
                ref={modalFileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => modalFileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Upload size={15} color="var(--primary)" />
                <span>Choose Picture from Computer</span>
              </button>
            </div>

            {/* Permanent File Drop Notice */}
            <div style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 20,
              fontSize: '0.78rem',
              color: '#166534',
              lineHeight: 1.5,
            }}>
              <strong>Permanent File Location:</strong> You can also copy your picture directly to{' '}
              <code style={{ background: '#DCFCE7', padding: '2px 4px', borderRadius: 4, fontWeight: 700 }}>
                client/public/logo.png
              </code>{' '}
              to make it permanent across the codebase.
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={handleResetToDefault}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 10px',
                }}
              >
                <RotateCcw size={14} />
                <span>Reset to Default</span>
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setPreviewSrc(null);
                  }}
                  className="btn-ghost"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPreview}
                  disabled={!previewSrc}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 20px',
                    fontSize: '0.85rem',
                    opacity: previewSrc ? 1 : 0.5,
                    cursor: previewSrc ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Check size={16} />
                  <span>Save Picture</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
