import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle, Building, Hash, Calendar, History, User, Wrench, Shield, ChevronRight, Star, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ticketApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { speakModulatedTicket, stopModulatedSpeech } from '../utils/voiceModulator';

export default function TicketDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Voice Modulation state
  const [isSpeakingTicket, setIsSpeakingTicket] = useState(false);
  const [voiceModulationInfo, setVoiceModulationInfo] = useState(null);
  const [voiceLang, setVoiceLang] = useState('hi-IN');

  // Student Feedback state
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);

  useEffect(() => {
    return () => {
      stopModulatedSpeech();
    };
  }, []);

  const handleVoiceModulate = (lang = voiceLang) => {
    if (isSpeakingTicket) {
      stopModulatedSpeech();
      setIsSpeakingTicket(false);
      setVoiceModulationInfo(null);
      return;
    }

    setVoiceLang(lang);
    setIsSpeakingTicket(true);
    const info = speakModulatedTicket(ticket, lang, {
      onStart: (data) => {
        setVoiceModulationInfo(data);
      },
      onEnd: () => {
        setIsSpeakingTicket(false);
        setVoiceModulationInfo(null);
      },
      onError: () => {
        setIsSpeakingTicket(false);
        setVoiceModulationInfo(null);
      }
    });
    if (info) setVoiceModulationInfo(info);
  };

  const fetchTicket = async () => {
    try {
      const res = await ticketApi.getById(id);
      if (res.data?.success) {
        setTicket(res.data.ticket);
        setNewStatus(res.data.ticket.status);
        if (res.data.ticket.rating) {
          setRating(res.data.ticket.rating);
          setFeedback(res.data.ticket.feedback || '');
        }
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      const res = await ticketApi.submitFeedback(id, { rating, feedback });
      if (res.data?.success) {
        setFeedbackSuccess('Thank you! Your feedback has been recorded.');
        await fetchTicket();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleStatusChange = async (statusToSet) => {
    setIsUpdating(true);
    try {
      const res = await ticketApi.update(id, { status: statusToSet });
      if (res.data?.success) {
        setNewStatus(statusToSet);
        await fetchTicket();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading ticket information...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-main)', marginBottom: '12px' }}>Ticket Not Found</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>The ticket with identifier "{id}" does not exist.</p>
        <Link to="/tickets" className="btn-secondary">Back to Tickets</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Back button */}
      <Link
        to="/tickets"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-dim)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          marginBottom: '20px',
          fontWeight: 500
        }}
      >
        <ArrowLeft size={16} /> Back to Tickets
      </Link>

      {/* Ticket Header Banner */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '6px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              {ticket.ticket_number}
            </span>
            <span className={`badge badge-status-${ticket.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
              {ticket.status}
            </span>
          </div>

          {/* Quick Status Updater */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Change Status:</span>
            {['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => (
              <button
                key={s}
                disabled={isUpdating || ticket.status === s}
                onClick={() => handleStatusChange(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: ticket.status === s ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                  color: ticket.status === s ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: ticket.status === s ? 'default' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Modulation Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: '12px',
          background: isSpeakingTicket ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
          border: isSpeakingTicket ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
          marginBottom: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleVoiceModulate(voiceLang)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: isSpeakingTicket ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: isSpeakingTicket ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(99, 102, 241, 0.4)'
              }}
            >
              {isSpeakingTicket ? <VolumeX size={17} /> : <Volume2 size={17} />}
              {isSpeakingTicket ? 'Stop Voice' : '🔊 Voice Modulate All Features'}
            </button>

            {/* Quick Language Toggle */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '3px', borderRadius: '8px' }}>
              {[
                { code: 'hi-IN', label: 'हिंदी' },
                { code: 'en-IN', label: 'EN' },
                { code: 'bn-IN', label: 'বাংলা' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleVoiceModulate(lang.code)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: voiceLang === lang.code ? '#6366f1' : 'transparent',
                    color: voiceLang === lang.code ? '#fff' : 'var(--text-dim)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <span style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: ticket.priority === 'Critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              color: ticket.priority === 'Critical' ? '#f87171' : '#a5b4fc',
              fontWeight: 700
            }}>
              Modulation: {ticket.priority === 'Critical' ? '1.25x Urgent Pitch' : ticket.priority === 'High' ? '1.12x Firm Pitch' : '1.0x Natural Pitch'}
            </span>
            {isSpeakingTicket && <span className="live-pulse-dot" style={{ background: '#38bdf8' }} />}
          </div>
        </div>

        <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', marginBottom: '8px' }}>
          {ticket.title}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 20px 0' }}>
          {ticket.description}
        </p>

        {/* Metadata Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Category</span>
            <div style={{ marginTop: '4px' }}>
              <span className={`badge badge-${ticket.category.toLowerCase().replace(' ', '-')}`}>
                {ticket.category}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Priority Level</span>
            <div style={{ marginTop: '4px' }}>
              <span className={`badge badge-${ticket.priority.toLowerCase()}`}>
                {ticket.priority}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Room / Block</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: 'var(--primary-600)', fontSize: '0.95rem' }}>
              {ticket.room_number ? `Room ${ticket.room_number}` : 'Hostel Campus'}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Department</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {ticket.department}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Reported On</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Assigned Host Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '16px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.3)'
            }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Single Assigned Campus Host / Warden
              </span>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                {ticket.host?.name || 'Prof. Sharma (Chief Hostel Host)'}
              </h4>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Official Host Contact: <strong style={{ color: 'var(--text-main)' }}>{ticket.host?.email || 'host@vaaniai.edu'}</strong>
          </div>
        </div>
      </div>

      {/* Requirement 5: Live 4-Step Progress Tracker */}
      <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Clock size={18} color="#38bdf8" /> Live Service Progress Tracker
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Step-by-step resolution lifecycle monitored by campus hostel authority.
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <Shield size={16} color="#f59e0b" />
            <span style={{ fontSize: '0.82rem', color: '#fcd34d', fontWeight: 700 }}>
              Assigned Host: Chief Hostel Warden (Admin)
            </span>
          </div>
        </div>

        {/* 4 Steps Container */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {/* Step 1 */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={16} color="#fff" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#34d399', fontWeight: 700 }}>Step 1: Reported</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Speech input transcribed & intent classified
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={16} color="#fff" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#38bdf8', fontWeight: 700 }}>Step 2: Host Assigned</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Routed directly to Hostel Host inbox
              </p>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                Host ID: {ticket.host_id ? ticket.host_id.slice(0, 8) : 'Chief-Host'}
              </span>
            </div>
          </div>

          {/* Step 3 */}
          {(() => {
            const isStep3 = ticket.status === 'In Progress' || ticket.status === 'Resolved' || ticket.status === 'Closed';
            return (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: isStep3 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isStep3 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isStep3 ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isStep3 ? <CheckCircle2 size={16} color="#fff" /> : <Clock size={16} color="#64748b" />}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: isStep3 ? '#a5b4fc' : 'var(--text-dim)', fontWeight: 700 }}>
                    Step 3: Dispatched
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {isStep3 ? 'Technician dispatched to room' : 'Awaiting host dispatch order'}
                  </p>
                  <span style={{ fontSize: '0.72rem', color: isStep3 ? '#34d399' : 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                    {isStep3 ? '● Active' : '○ Queued'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Step 4 */}
          {(() => {
            const isStep4 = ticket.status === 'Resolved' || ticket.status === 'Closed';
            return (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: isStep4 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isStep4 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isStep4 ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isStep4 ? <CheckCircle2 size={16} color="#fff" /> : <Clock size={16} color="#64748b" />}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: isStep4 ? '#34d399' : 'var(--text-dim)', fontWeight: 700 }}>
                    Step 4: Resolved
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {isStep4 ? 'Work verified and completed' : 'Awaiting resolution'}
                  </p>
                  <span style={{ fontSize: '0.72rem', color: isStep4 ? '#34d399' : 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                    {isStep4 ? '● Completed' : '○ Pending'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Requirement 5: Student Feedback Option Card */}
      <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: '24px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Star size={18} color="#f59e0b" fill="#f59e0b" /> Student Feedback & Quality Rating
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Rate how satisfactorily the campus team and host handled this issue.
            </p>
          </div>
          {ticket.rating && (
            <span style={{
              padding: '4px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              ✓ Feedback Submitted
            </span>
          )}
        </div>

        {feedbackSuccess && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            marginBottom: '16px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> {feedbackSuccess}
          </div>
        )}

        <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Star selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Rate Resolution Quality (1 to 5 Stars):
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Star
                    size={28}
                    color={s <= rating ? '#f59e0b' : '#475569'}
                    fill={s <= rating ? '#f59e0b' : 'none'}
                  />
                </button>
              ))}
              <span style={{ marginLeft: '10px', fontSize: '0.95rem', color: '#f59e0b', fontWeight: 800 }}>
                {rating} / 5 Stars
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Your Comments or Review:
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Electrician arrived on time and repaired the switch neatly. Highly satisfied!"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submittingFeedback}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
            >
              {submittingFeedback ? 'Saving Feedback...' : (ticket.rating ? 'Update Feedback' : 'Submit Feedback')}
            </button>
          </div>
        </form>
      </div>

      {/* Audit Event Timeline (PRD Requirement 15: TICKET_EVENTS) */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#818cf8" /> Audit Event Timeline
        </h3>

        {ticket.events && ticket.events.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Vertical timeline line */}
            <div style={{
              position: 'absolute',
              top: '10px',
              bottom: '10px',
              left: '7px',
              width: '2px',
              background: 'rgba(99, 102, 241, 0.3)'
            }} />

            {ticket.events.map((evt, idx) => (
              <div key={evt.id || idx} style={{ position: 'relative' }}>
                {/* Timeline node icon */}
                <div style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: evt.event_type === 'TICKET_CREATED' ? '#10b981' : '#38bdf8',
                  boxShadow: `0 0 8px ${evt.event_type === 'TICKET_CREATED' ? '#10b981' : '#38bdf8'}`,
                  border: '2px solid var(--bg-primary)'
                }} />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: evt.event_type === 'TICKET_CREATED' ? '#4ade80' : '#e2e8f0'
                    }}>
                      {evt.event_type.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(evt.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                    {evt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>No events recorded for this ticket.</p>
        )}
      </div>
    </div>
  );
}
