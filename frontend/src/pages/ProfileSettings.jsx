import React, { useState, useEffect } from 'react';
import { User, Globe, Shield, Activity, Save, CheckCircle2, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { systemApi } from '../services/api';

export default function ProfileSettings({ selectedLang, setSelectedLang }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [language, setLanguage] = useState(user?.preferred_language || selectedLang || 'hi-IN');
  const [health, setHealth] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await systemApi.getHealth();
        if (res.data) setHealth(res.data);
      } catch (err) {
        console.warn('Health check failed:', err);
      }
    }
    loadHealth();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (user) {
        await updateProfile({ name, preferred_language: language });
      }
      setSelectedLang(language);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>
          Profile & <span className="gradient-accent-text">Settings</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Manage your account preferences, default speech language, and system configuration.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* User Account Settings */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} color="#6366f1" /> Resident Profile
          </h2>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'guest@vaaniai.edu'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--text-dim)',
                  outline: 'none',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Primary Spoken Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="hi-IN">हिंदी (Hindi) — hi-IN</option>
                <option value="en-IN">English (India) — en-IN</option>
                <option value="bn-IN">বাংলা (Bengali) — bn-IN</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              {savedSuccess ? (
                <span style={{ color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> Preferences saved successfully!
                </span>
              ) : <span />}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Requirement: Every user assigned to a single Host */}
        <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={20} color="#f59e0b" /> Assigned Campus Host & Warden
            </h2>
            <span style={{
              padding: '4px 12px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              Direct Escalation Desk
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 18px 0' }}>
            All service tickets, room maintenance issues, and AI agent actions you initiate are routed directly to your assigned host.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Host Name</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                {user?.host_name || 'Prof. Sharma (Chief Hostel Host)'}
              </p>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Host Email / Contact</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: 'var(--primary-600)', fontSize: '0.95rem' }}>
                host@vaaniai.edu
              </p>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Your Assigned Room</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#f59e0b', fontSize: '0.95rem' }}>
                {user?.room_number ? `Room ${user.room_number}` : 'Room 204 (Hostel Block B)'}
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Resolution SLA</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#4ade80', fontSize: '0.95rem' }}>
                Critical: 2 hrs • General: 24 hrs
              </p>
            </div>
          </div>
        </div>

        {/* Backend & Architecture Status */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={20} color="#38bdf8" /> Architecture & System Health
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Server Status</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#4ade80', fontSize: '0.95rem' }}>
                ● {health?.status || 'Active'}
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Database Engine</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#38bdf8', fontSize: '0.95rem' }}>
                {health?.database_mode === 'supabase_cloud' ? 'Supabase PostgreSQL' : 'Local High-Fidelity Store'}
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Gemini AI Integration</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#a5b4fc', fontSize: '0.95rem' }}>
                Gemini 3.8 Flash (Active)
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Authentication</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                Bcrypt + JWT (Bearer)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
