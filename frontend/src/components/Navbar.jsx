import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mic, LayoutDashboard, Ticket, History, User, LogOut, Globe, Sparkles, Menu, X, Shield, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ selectedLang, setSelectedLang, theme, setTheme }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHost = user?.role === 'HOST' || user?.role === 'ADMIN';

  const navLinks = isHost ? [
    { name: 'Host Console', path: '/host-dashboard', icon: Shield, highlight: true },
    { name: 'All Tickets', path: '/tickets', icon: Ticket },
    { name: 'Voice Agent', path: '/', icon: Mic },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
  ] : [
    { name: 'Voice Agent', path: '/', icon: Mic, highlight: true },
    { name: 'Track Tickets', path: '/tickets', icon: Ticket },
    { name: 'History', path: '/history', icon: History },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
  ];

  const languages = [
    { code: 'hi-IN', label: 'हिंदी (Hindi)', short: 'HI' },
    { code: 'en-IN', label: 'English (India)', short: 'EN' },
    { code: 'bn-IN', label: 'বাংলা (Bengali)', short: 'BN' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      transition: 'background 0.3s ease, border-color 0.3s ease'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary-500) 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-neon)'
          }}>
            <Mic size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>Vaani<span style={{ color: 'var(--primary-500)' }}>AI</span></span>
              <span style={{
                background: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--primary-500)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>v1.0</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, letterSpacing: '0.01em' }}>Your Voice. Understood.</p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div style={{ display: 'none', mdDisplay: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
                  background: isActive ? (link.highlight ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(6, 182, 212, 0.12))' : 'rgba(139, 92, 246, 0.08)') : 'transparent',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isActive ? 'var(--primary-600)' : 'currentColor'} />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Section: Language Switcher, Theme Toggle & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setTheme && setTheme(theme === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: theme === 'light' ? '#d97706' : '#a855f7',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease'
            }}
          >
            {theme === 'light' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-subtle)' }}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedLang === l.code ? 'var(--primary-500)' : 'transparent',
                  color: selectedLang === l.code ? '#ffffff' : 'var(--text-dim)',
                  transition: 'all 0.15s ease'
                }}
                title={l.label}
              >
                {l.short}
              </button>
            ))}
          </div>

          {/* User Auth Info */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link
                to="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  textDecoration: 'none',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-500), #38bdf8)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span style={{ fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: isHost ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                  color: isHost ? '#d97706' : 'var(--primary-600)',
                  border: `1px solid ${isHost ? 'rgba(245, 158, 11, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                }}>
                  {isHost ? '🏢 Host' : '🎓 Student'}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link to="/login" className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                Log In
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-toggle"
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: isActive ? '#38bdf8' : 'var(--text-main)',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  fontWeight: 500
                }}
              >
                <Icon size={18} />
                {link.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Desktop/Mobile CSS helper styles */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
