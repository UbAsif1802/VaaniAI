import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [activePortal, setActivePortal] = useState('STUDENT'); // 'STUDENT' | 'HOST'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handlePortalSwitch = (portal) => {
    setActivePortal(portal);
    setError(null);
    if (portal === 'HOST') {
      setEmail('host@vaaniai.edu');
      setPassword('Password123!');
    } else {
      setEmail('student@vaaniai.edu');
      setPassword('Password123!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        const userRole = res.user?.role;
        if (userRole === 'HOST' || userRole === 'ADMIN') {
          navigate('/host-dashboard');
        } else {
          navigate('/');
        }
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoStudent = () => {
    setActivePortal('STUDENT');
    setEmail('student@vaaniai.edu');
    setPassword('Password123!');
  };

  const fillDemoHost = () => {
    setActivePortal('HOST');
    setEmail('host@vaaniai.edu');
    setPassword('Password123!');
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '36px 32px',
        background: 'rgba(16, 22, 35, 0.9)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: activePortal === 'HOST'
              ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
              : 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            boxShadow: activePortal === 'HOST' ? '0 0 25px rgba(245, 158, 11, 0.4)' : '0 0 25px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.3s ease'
          }}>
            <Mic size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>VaaniAI Portals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Select your portal to access AI voice resolution services
          </p>
        </div>

        {/* Dual Portal Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          padding: '4px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => handlePortalSwitch('STUDENT')}
            style={{
              padding: '10px 14px',
              borderRadius: '9px',
              border: 'none',
              background: activePortal === 'STUDENT'
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(6, 182, 212, 0.8))'
                : 'transparent',
              color: activePortal === 'STUDENT' ? '#fff' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            🎓 Student Portal
          </button>
          <button
            type="button"
            onClick={() => handlePortalSwitch('HOST')}
            style={{
              padding: '10px 14px',
              borderRadius: '9px',
              border: 'none',
              background: activePortal === 'HOST'
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(239, 68, 68, 0.85))'
                : 'transparent',
              color: activePortal === 'HOST' ? '#fff' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            🏢 Host / Warden
          </button>
        </div>

        {/* Portal Information Badge */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: activePortal === 'HOST' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          border: `1px solid ${activePortal === 'HOST' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.25)'}`,
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{
              fontSize: '0.74rem',
              color: activePortal === 'HOST' ? '#fcd34d' : '#a5b4fc',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {activePortal === 'HOST' ? '🏢 Chief Hostel Admin Access' : '🎓 Student Voice Access'}
            </span>
            <button
              type="button"
              onClick={activePortal === 'HOST' ? fillDemoHost : fillDemoStudent}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Autofill Credentials ⚡
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {activePortal === 'HOST'
              ? 'Receive, triage, and manage campus tickets assigned to you with live status overrides.'
              : 'Speak or type requests, track ticket status live, and provide 5-star ratings & reviews.'}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Campus Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@vaaniai.edu"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '6px', padding: '12px' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          Don't have an account yet?{' '}
          <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
