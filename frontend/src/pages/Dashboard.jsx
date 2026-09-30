import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, AlertCircle, Mic, ArrowUpRight, TrendingUp, BarChart3, Wrench } from 'lucide-react';
import { ticketApi } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, ticketsRes] = await Promise.all([
          ticketApi.getStats(),
          ticketApi.list({ limit: 5 })
        ]);
        if (statsRes.data?.success) setStats(statsRes.data.stats);
        if (ticketsRes.data?.success) setRecentTickets(ticketsRes.data.tickets);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  const statCards = [
    { title: 'Total Service Requests', count: stats?.total || 0, icon: LayoutDashboard, color: '#818cf8', bg: 'rgba(129, 140, 248, 0.1)' },
    { title: 'Open Tickets', count: stats?.open || 0, icon: Clock, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' },
    { title: 'In Progress', count: stats?.in_progress || 0, icon: TrendingUp, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
    { title: 'Resolved & Closed', count: stats?.resolved || 0, icon: CheckCircle2, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
    { title: 'Critical Issues', count: stats?.critical || 0, icon: AlertTriangle, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>
            Campus Service <span className="gradient-accent-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Real-time analytics and resolution oversight for institutional service requests.
          </p>
        </div>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 20px' }}>
          <Mic size={18} /> Speak a New Request
        </Link>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {c.title}
                </span>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: c.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={18} color={c.color} />
                </div>
              </div>
              <h2 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 800, color: '#fff' }}>
                {c.count}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Analytics Breakdown Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Category Breakdown */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="#818cf8" /> Requests by Category
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {stats?.by_category && Object.keys(stats.by_category).length > 0 ? (
              Object.entries(stats.by_category).map(([cat, count]) => {
                const total = stats.total || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{cat}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No categorized requests recorded yet.</p>
            )}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#f59e0b" /> Severity & Priority Levels
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {['Critical', 'High', 'Medium', 'Low'].map((prio) => {
              const count = stats?.by_priority?.[prio] || 0;
              const total = stats?.total || 1;
              const pct = Math.round((count / total) * 100);
              const colorMap = {
                Critical: '#f87171',
                High: '#fb923c',
                Medium: '#facc15',
                Low: '#4ade80'
              };
              return (
                <div key={prio}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: colorMap[prio] }}>{prio} Priority</span>
                    <span style={{ color: 'var(--text-dim)' }}>{count} tickets</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: colorMap[prio],
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Verified Tickets</h3>
          <Link to="/tickets" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            View All Tickets →
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No tickets registered yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentTickets.map((t) => (
              <Link
                key={t.id}
                to={`/tickets/${t.id}`}
                className="glass-card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: '#38bdf8'
                  }}>
                    {t.ticket_number}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#fff' }}>{t.title}</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Room {t.room_number || 'Hostel'} • {t.department}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge badge-${t.category.toLowerCase().replace(' ', '-')}`}>
                    {t.category}
                  </span>
                  <span className={`badge badge-${t.priority.toLowerCase()}`}>
                    {t.priority}
                  </span>
                  <span className={`badge badge-status-${t.status.toLowerCase().replace(' ', '')}`}>
                    {t.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
