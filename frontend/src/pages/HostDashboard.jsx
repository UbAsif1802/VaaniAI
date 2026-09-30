import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Ticket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  Search,
  Filter,
  RefreshCw,
  User,
  Building,
  MessageSquare,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Volume2,
  VolumeX
} from 'lucide-react';
import { hostApi, ticketApi } from '../services/api';
import { speakModulatedTicket, stopModulatedSpeech } from '../utils/voiceModulator';

export default function HostDashboard() {
  const [data, setData] = useState({ stats: null, tickets: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    speakModulatedTicket(ticket, 'en-IN', {
      onEnd: () => setPlayingTicketId(null),
      onError: () => setPlayingTicketId(null)
    });
  };
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchHostData = async () => {
    setLoading(true);
    try {
      const res = await hostApi.getOverview();
      if (res.data?.success) {
        setData({
          stats: res.data.stats,
          tickets: res.data.tickets || []
        });
      }
    } catch (err) {
      console.error('Failed to load host overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostData();
  }, []);

  const handleStatusUpdate = async (ticketId, newStatus) => {
    setUpdatingId(ticketId);
    try {
      const res = await hostApi.updateTicketStatus(ticketId, {
        status: newStatus,
        resolution_note: `Status updated to ${newStatus} by Chief Hostel Host.`
      });
      if (res.data?.success) {
        await fetchHostData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ticket status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter tickets
  const filteredTickets = data.tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (priorityFilter !== 'ALL' && t.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
    if (categoryFilter !== 'ALL' && t.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNum = t.ticket_number?.toLowerCase().includes(q);
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchRoom = t.room_number?.toLowerCase().includes(q);
      const matchUser = t.users?.name?.toLowerCase().includes(q);
      if (!matchNum && !matchTitle && !matchDesc && !matchRoom && !matchUser) return false;
    }
    return true;
  });

  const categories = ['Electrical', 'Plumbing', 'IT Support', 'Cleaning', 'Security', 'Hostel', 'Transport', 'General'];
  const priorities = ['Critical', 'High', 'Medium', 'Low'];
  const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px', minHeight: 'calc(100vh - 70px)' }}>
      {/* Host Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)'
            }}>
              <Shield size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.85rem', margin: 0 }}>
                Hostel <span style={{ color: '#fbbf24' }}>Host & Warden</span> Central Console
              </h1>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ADMINISTRATIVE CONTROL • ALL TICKETS ROUTED HERE
              </span>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
            All campus student service tickets and voice-modulated requests are assigned to your host queue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchHostData}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
          <Link
            to="/"
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Sparkles size={14} /> Open AI Voice Console
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {data.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {/* Total Tickets */}
          <div className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>All Host Tickets</span>
              <Ticket size={18} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{data.stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Across all hostel blocks</div>
          </div>

          {/* Open Tickets */}
          <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Awaiting Action</span>
              <Clock size={18} color="#38bdf8" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#38bdf8' }}>{data.stats.open}</div>
            <div style={{ fontSize: '0.75rem', color: '#7dd3fc', marginTop: '4px' }}>Needs host review</div>
          </div>

          {/* In Progress */}
          <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '4px solid #fbbf24' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>In Progress</span>
              <Clock size={18} color="#fbbf24" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fbbf24' }}>{data.stats.in_progress}</div>
            <div style={{ fontSize: '0.75rem', color: '#fde68a', marginTop: '4px' }}>Technician dispatched</div>
          </div>

          {/* Critical Priority */}
          <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '4px solid #f87171' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Critical Urgent</span>
              <AlertTriangle size={18} color="#f87171" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f87171' }}>{data.stats.critical}</div>
            <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px' }}>Voice modulated emergency</div>
          </div>

          {/* Student Satisfaction Rating */}
          <div className="glass-panel" style={{ padding: '18px 20px', borderLeft: '4px solid #4ade80' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Student Rating</span>
              <Star size={18} color="#facc15" fill="#facc15" />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#facc15', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              {data.stats.avgRating} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/ 5.0</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#86efac', marginTop: '4px' }}>
              {data.stats.feedbackCount} student reviews received
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket #, student name, room, keyword..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Departments</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Tickets Master List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
            Managed Student Tickets ({filteredTickets.length})
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Showing real-time ticket stream assigned to Host
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
            Loading tickets data for Host...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
            No tickets match the selected filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredTickets.map((t) => {
              const priorityClass = t.priority ? t.priority.toLowerCase() : 'medium';
              return (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Top Bar: Ticket #, Student info, Category, Priority */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: 'var(--primary-600)',
                        background: 'rgba(139, 92, 246, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.25)'
                      }}>
                        {t.ticket_number}
                      </span>

                      <span className={`badge badge-${t.category.toLowerCase().replace(' ', '-')}`}>
                        {t.category}
                      </span>

                      <span className={`badge badge-${priorityClass}`}>
                        {t.priority} Priority
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePlayTicketVoice(t)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: '1px solid rgba(139, 92, 246, 0.4)',
                          background: playingTicketId === t.id ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'rgba(139, 92, 246, 0.12)',
                          color: playingTicketId === t.id ? '#fff' : 'var(--primary-600)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Voice Modulate Ticket"
                      >
                        {playingTicketId === t.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        {playingTicketId === t.id ? 'Stop' : '🔊 Voice'}
                      </button>
                      <Link
                        to={`/tickets/${t.id || t.ticket_number}`}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Timeline <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Title and Description */}
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                    {t.title}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                    {t.description}
                  </p>

                  {/* Metadata Chips: Student Name, Room, Host Assigned */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '4px 10px', borderRadius: '8px' }}>
                      <User size={14} color="#8b5cf6" />
                      <span>Student: <strong>{t.users?.name || 'Resident Student'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '4px 10px', borderRadius: '8px' }}>
                      <Building size={14} color="#0284c7" />
                      <span>Room / Block: <strong>{t.room_number || t.location || 'Hostel'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '4px 10px', borderRadius: '8px', color: '#d97706' }}>
                      <Shield size={14} />
                      <span>Assigned Host: <strong>Warden (You)</strong></span>
                    </div>
                  </div>

                  {/* Student Rating & Feedback Section (If submitted) */}
                  {t.rating && (
                    <div style={{
                      background: 'rgba(250, 204, 21, 0.08)',
                      border: '1px solid rgba(250, 204, 21, 0.25)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={16}
                            color="#facc15"
                            fill={s <= t.rating ? '#facc15' : 'transparent'}
                          />
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#facc15', textTransform: 'uppercase' }}>
                          Student Feedback ({t.rating}/5 Stars):
                        </span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#fef08a', fontStyle: 'italic' }}>
                          "{t.feedback}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status Progression Controls for Host */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Current Status:</span>
                      <span className={`badge badge-status-${t.status.toLowerCase().replace(' ', '')}`}>
                        {t.status}
                      </span>
                    </div>

                    {/* Quick Status Action Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {t.status === 'Open' && (
                        <button
                          disabled={updatingId === t.id}
                          onClick={() => handleStatusUpdate(t.id, 'In Progress')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(251, 191, 36, 0.4)',
                            background: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Dispatch / In Progress
                        </button>
                      )}

                      {t.status !== 'Resolved' && t.status !== 'Closed' && (
                        <button
                          disabled={updatingId === t.id}
                          onClick={() => handleStatusUpdate(t.id, 'Resolved')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(74, 222, 128, 0.4)',
                            background: 'rgba(74, 222, 128, 0.15)',
                            color: '#4ade80',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Mark as Resolved
                        </button>
                      )}

                      {t.status !== 'Closed' && (
                        <button
                          disabled={updatingId === t.id}
                          onClick={() => handleStatusUpdate(t.id, 'Closed')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: '#cbd5e1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Close Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
