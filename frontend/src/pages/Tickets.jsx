import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Search, Filter, Plus, ArrowUpDown, ChevronRight, Mic, CheckCircle2, Star, Shield, Clock, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ticketApi } from '../services/api';
import { speakModulatedTicket, stopModulatedSpeech } from '../utils/voiceModulator';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Voice Modulation state
  const [playingTicketId, setPlayingTicketId] = useState(null);

  useEffect(() => {
    return () => {
      stopModulatedSpeech();
    };
  }, []);

  const handlePlayTicketVoice = (ticket) => {
    if (playingTicketId === ticket.id) {
      stopModulatedSpeech();
      setPlayingTicketId(null);
      return;
    }

    setPlayingTicketId(ticket.id);
    speakModulatedTicket(ticket, 'hi-IN', {
      onEnd: () => setPlayingTicketId(null),
      onError: () => setPlayingTicketId(null)
    });
  };

  // Feedback modal state
  const [feedbackTicket, setFeedbackTicket] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);

  // New ticket form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Electrical');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newRoom, setNewRoom] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedPriority) params.priority = selectedPriority;

      const res = await ticketApi.list(params);
      if (res.data?.success) {
        setTickets(res.data.tickets);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedStatus, selectedCategory, selectedPriority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await ticketApi.create({
        title: newTitle,
        description: newDescription,
        category: newCategory,
        priority: newPriority,
        room_number: newRoom || null,
        department: newCategory,
        location: 'Hostel'
      });
      if (res.data?.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewRoom('');
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create ticket');
    }
  };

  const openFeedbackModal = (e, ticket) => {
    e.preventDefault();
    e.stopPropagation();
    setFeedbackTicket(ticket);
    setFeedbackRating(ticket.rating || 5);
    setFeedbackText(ticket.feedback || '');
    setFeedbackSuccess(null);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackTicket) return;
    setSubmittingFeedback(true);
    try {
      const res = await ticketApi.submitFeedback(feedbackTicket.id, {
        rating: feedbackRating,
        feedback: feedbackText
      });
      if (res.data?.success) {
        setFeedbackSuccess('Thank you! Your feedback has been recorded.');
        setTimeout(() => {
          setFeedbackTicket(null);
          setFeedbackSuccess(null);
          fetchTickets();
        }, 1000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStepCompleted = (status, stepNum) => {
    // 1: Reported (always true)
    if (stepNum === 1) return true;
    // 2: Assigned to Host (always true)
    if (stepNum === 2) return true;
    // 3: In Progress (true if 'In Progress', 'Resolved', 'Closed')
    if (stepNum === 3) return status === 'In Progress' || status === 'Resolved' || status === 'Closed';
    // 4: Resolved / Closed (true if 'Resolved', 'Closed')
    if (stepNum === 4) return status === 'Resolved' || status === 'Closed';
    return false;
  };

  const categories = ['Electrical', 'Plumbing', 'IT Support', 'Cleaning', 'Security', 'Hostel', 'Transport', 'General'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>
            Service <span className="gradient-accent-text">Tickets</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage, filter, and track verified campus maintenance and support requests.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <Mic size={16} /> Voice Agent
          </Link>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={16} /> Manual Ticket
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 280px', display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket #, room, or issue description..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>
            <button type="submit" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              Search
            </button>
          </form>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '9px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Priority Dropdown */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              padding: '9px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setSelectedStatus('')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: selectedStatus === '' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
              color: selectedStatus === '' ? '#fff' : 'var(--text-muted)'
            }}
          >
            All Statuses
          </button>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: selectedStatus === s ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                color: selectedStatus === s ? '#fff' : 'var(--text-muted)'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
          Loading tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <Ticket size={40} color="var(--border-active)" style={{ marginBottom: '14px', opacity: 0.6 }} />
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 6px 0' }}>No tickets found</h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>No service requests match your search or filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tickets.map((t) => {
            const step1Done = getStepCompleted(t.status, 1);
            const step2Done = getStepCompleted(t.status, 2);
            const step3Done = getStepCompleted(t.status, 3);
            const step4Done = getStepCompleted(t.status, 4);

            return (
              <div
                key={t.id}
                className="glass-panel"
                style={{
                  padding: '22px 24px',
                  background: 'rgba(16, 22, 35, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Header Row: ID, Title, Badges, View Details */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: '#38bdf8'
                    }}>
                      {t.ticket_number}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#ffffff' }}>
                        {t.title}
                      </h3>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Room: <strong style={{ color: '#e2e8f0' }}>{t.room_number || 'Hostel Campus'}</strong> • Dept: <strong style={{ color: '#e2e8f0' }}>{t.department}</strong> • {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge badge-${t.category.toLowerCase().replace(' ', '-')}`}>
                      {t.category}
                    </span>
                    <span className={`badge badge-${t.priority.toLowerCase()}`}>
                      {t.priority}
                    </span>
                    <span className={`badge badge-status-${t.status.toLowerCase().replace(' ', '')}`}>
                      {t.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlayTicketVoice(t);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        background: playingTicketId === t.id ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'rgba(99, 102, 241, 0.15)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Listen with Priority Voice Modulation"
                    >
                      {playingTicketId === t.id ? <VolumeX size={14} /> : <Volume2 size={14} color="#38bdf8" />}
                      {playingTicketId === t.id ? 'Stop' : '🔊 Voice'}
                    </button>
                    <Link
                      to={`/tickets/${t.id}`}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Requirement 5: Live 4-Step Progress Tracker */}
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📍 Real-Time Progress Tracker
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={12} /> Assigned to: <strong style={{ color: '#fcd34d' }}>Chief Hostel Warden</strong>
                    </span>
                  </div>

                  {/* 4-Step Tracker Flow */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', position: 'relative' }}>
                    {/* Step 1: Reported */}
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: step1Done ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${step1Done ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '3px' }}>
                        <CheckCircle2 size={13} color={step1Done ? '#34d399' : '#64748b'} />
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: step1Done ? '#34d399' : 'var(--text-dim)' }}>
                          1. Reported
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Voice verified</span>
                    </div>

                    {/* Step 2: Assigned to Host */}
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: step2Done ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${step2Done ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '3px' }}>
                        <CheckCircle2 size={13} color={step2Done ? '#38bdf8' : '#64748b'} />
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: step2Done ? '#38bdf8' : 'var(--text-dim)' }}>
                          2. Host Routed
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Hostel Warden</span>
                    </div>

                    {/* Step 3: In Progress / Dispatched */}
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: step3Done ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${step3Done ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '3px' }}>
                        {step3Done ? <CheckCircle2 size={13} color="#a5b4fc" /> : <Clock size={13} color="#64748b" />}
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: step3Done ? '#a5b4fc' : 'var(--text-dim)' }}>
                          3. Dispatched
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{step3Done ? 'Work underway' : 'Pending staff'}</span>
                    </div>

                    {/* Step 4: Resolved & Closed */}
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: step4Done ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${step4Done ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '3px' }}>
                        {step4Done ? <CheckCircle2 size={13} color="#34d399" /> : <Clock size={13} color="#64748b" />}
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: step4Done ? '#34d399' : 'var(--text-dim)' }}>
                          4. Resolved
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{step4Done ? 'Fixed & Closed' : 'Final review'}</span>
                    </div>
                  </div>
                </div>

                {/* Requirement 5: Student Feedback Option */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  {t.rating ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} fill={s <= t.rating ? '#f59e0b' : 'none'} color="#f59e0b" />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600 }}>
                        {t.rating}/5 Stars
                      </span>
                      {t.feedback && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          — "{t.feedback}"
                        </span>
                      )}
                      <button
                        onClick={(e) => openFeedbackModal(e, t)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Feedback not submitted yet
                      </span>
                      <button
                        onClick={(e) => openFeedbackModal(e, t)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#fcd34d',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Star size={13} fill="#fcd34d" /> Give Feedback & Rating
                      </button>
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Host ID: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{t.host_id ? t.host_id.slice(0, 8) + '...' : 'Auto-routed'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Ticket Creation Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-main)' }}>Create Service Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Ticket Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Ceiling Fan Not Rotating"
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
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Issue Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the problem, symptoms, or malfunction in detail..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      color: 'var(--text-main)'
                    }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      color: 'var(--text-main)'
                    }}
                  >
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Room Number (e.g. 204)
                </label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="204"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Feedback & Star Rating Modal */}
      {feedbackTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--bg-secondary)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={20} color="#f59e0b" fill="#f59e0b" />
                <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>Student Feedback</h2>
              </div>
              <button
                onClick={() => setFeedbackTicket(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 700 }}>
                {feedbackTicket.ticket_number}
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {feedbackTicket.title}
              </p>
            </div>

            {feedbackSuccess ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '12px',
                color: '#34d399'
              }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto' }} />
                <p style={{ fontWeight: 700, margin: 0 }}>{feedbackSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 5-Star Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Service Resolution Rating:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackRating(star)}
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
                          color={star <= feedbackRating ? '#f59e0b' : '#475569'}
                          fill={star <= feedbackRating ? '#f59e0b' : 'none'}
                        />
                      </button>
                    ))}
                    <span style={{ marginLeft: '8px', fontSize: '0.9rem', color: '#f59e0b', fontWeight: 700 }}>
                      {feedbackRating} of 5 Stars
                    </span>
                  </div>
                </div>

                {/* Review Textarea */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Feedback & Comments:
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Describe how well and quickly the problem was resolved..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setFeedbackTicket(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                  >
                    {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
