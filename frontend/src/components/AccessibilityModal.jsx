import React from 'react';
import { X, Eye, Zap, Type, Globe, Volume2, Check, Sliders } from 'lucide-react';

export default function AccessibilityModal({
  isOpen,
  onClose,
  theme,
  setTheme,
  highContrast,
  setHighContrast,
  reducedMotion,
  setReducedMotion,
  fontSize,
  setFontSize,
  selectedLang,
  setSelectedLang,
  speechCadence,
  setSpeechCadence
}) {
  if (!isOpen) return null;

  const languages = [
    { code: 'hi-IN', label: 'हिंदी (Hindi)', dir: 'ltr' },
    { code: 'en-IN', label: 'English (India)', dir: 'ltr' },
    { code: 'bn-IN', label: 'বাংলা (Bengali)', dir: 'ltr' },
    { code: 'ta-IN', label: 'தமிழ் (Tamil)', dir: 'ltr' },
    { code: 'te-IN', label: 'తెలుగు (Telugu)', dir: 'ltr' },
    { code: 'mr-IN', label: 'मराठी (Marathi)', dir: 'ltr' },
    { code: 'ar-SA', label: 'العربية (Arabic - RTL)', dir: 'rtl' }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: 'var(--color-surface-container)',
          border: '1px solid var(--border-active)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--color-on-surface)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 id="a11y-title" style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-display)' }}>
                Sensory & Accessibility Settings
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                Mindful human expression • WCAG AAA standard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-on-surface-variant)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Theme Option */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
              Visual Atmosphere / Theme
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: theme === 'light' ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                  background: theme === 'light' ? 'var(--color-primary-container)' : 'var(--color-surface-container-high)',
                  color: 'var(--color-on-surface)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                ☀️ Normal (Light Mode)
                {theme === 'light' && <Check size={16} color="var(--color-primary)" />}
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: theme === 'dark' ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                  background: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'var(--color-surface-container-high)',
                  color: 'var(--color-on-surface)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                🌙 Dark Mode (OLED)
                {theme === 'dark' && <Check size={16} color="var(--color-primary)" />}
              </button>
            </div>
          </div>

          {/* High Contrast Mode */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface-container-high)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Eye size={18} color="var(--color-primary)" />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>High Contrast (WCAG AAA)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Sharpen borders and maximize text contrast</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>

          {/* Reduced Motion */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface-container-high)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap size={18} color="var(--color-secondary)" />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Reduced Motion / Simple Fallback</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Disables 3D swirl & particle oscillations</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>

          {/* Font Scaling */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
              <Type size={16} /> Font & Reading Size
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'standard', label: 'Standard (100%)' },
                { id: 'large', label: 'Large (115%)' },
                { id: 'xlarge', label: 'Extra (130%)' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFontSize(item.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: fontSize === item.id ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                    background: fontSize === item.id ? 'var(--color-primary-container)' : 'var(--color-surface-container-high)',
                    color: 'var(--color-on-surface)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Multilingual Language & RTL Selection */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
              <Globe size={16} /> Multilingual Audio & UI Localization
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSelectedLang(l.code)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: selectedLang === l.code ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                    background: selectedLang === l.code ? 'var(--color-primary-container)' : 'var(--color-surface-container-high)',
                    color: 'var(--color-on-surface)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span>{l.label}</span>
                  {selectedLang === l.code && <Check size={14} color="var(--color-primary)" />}
                </button>
              ))}
            </div>
            {selectedLang === 'ar-SA' && (
              <p style={{ margin: '6px 0 0 0', fontSize: '0.74rem', color: 'var(--color-primary-fixed)', fontStyle: 'italic' }}>
                ✓ Right-to-Left (RTL) typography & layout engaged automatically.
              </p>
            )}
          </div>

          {/* Speech Cadence */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
              <Volume2 size={16} /> Vocal Cadence & Speech Rate
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { rate: 0.9, label: 'Gentle (0.9x)' },
                { rate: 1.0, label: 'Natural (1.0x)' },
                { rate: 1.2, label: 'Firm (1.2x)' }
              ].map((c) => (
                <button
                  key={c.rate}
                  type="button"
                  onClick={() => setSpeechCadence(c.rate)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: speechCadence === c.rate ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                    background: speechCadence === c.rate ? 'var(--color-primary-container)' : 'var(--color-surface-container-high)',
                    color: 'var(--color-on-surface)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Done Button */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
          >
            Apply & Return to Sanctuary
          </button>
        </div>
      </div>
    </div>
  );
}
