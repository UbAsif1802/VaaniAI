import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, MessageSquare, Mic, Calendar, ChevronRight, User, Bot, Ticket } from 'lucide-react';
import { conversationApi } from '../services/api';
import { Link } from 'react-router-dom';

export default function History() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await conversationApi.list();
        if (res.data?.success) {
          setConversations(res.data.conversations);
          if (res.data.conversations.length > 0) {
            handleSelectConversation(res.data.conversations[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConversations();
  }, []);

  const handleSelectConversation = async (conv) => {
    setSelectedConv(conv);
    setLoadingMsgs(true);
    try {
      const res = await conversationApi.getById(conv.id);
      if (res.data?.success) {
        setConvMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>
          Conversation <span className="gradient-accent-text">History</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Review past voice dialogue interactions, extracted entities, and resolution records.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
          Loading conversation logs...
        </div>
      ) : conversations.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <MessageSquare size={40} color="var(--border-active)" style={{ marginBottom: '14px', opacity: 0.6 }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 6px 0' }}>No conversations yet</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem' }}>Start speaking in the Voice Assistant to create your first session.</p>
          <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
            Go to Voice Agent
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: '24px'
        }} className="history-layout">
          
          {/* Left Column: Conversation Sessions List */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '680px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#cbd5e1', padding: '8px 8px 12px 8px', borderBottom: '1px solid var(--border-subtle)', margin: 0 }}>
              Recent Sessions ({conversations.length})
            </h3>
            {conversations.map((c) => {
              const isSelected = selectedConv?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversation(c)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid var(--border-active)' : '1px solid transparent',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: isSelected ? '#38bdf8' : 'var(--text-dim)', fontWeight: 600 }}>
                      {c.language || 'hi-IN'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {new Date(c.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', color: isSelected ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.title}
                  </h4>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Conversation Messages */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
            {selectedConv ? (
              <>
                <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>
                      {selectedConv.title}
                    </h2>
                    <span style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      Language: {selectedConv.language}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    Session ID: {selectedConv.id}
                  </p>
                </div>

                {loadingMsgs ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                    Loading dialogue turns...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                    {convMessages.map((msg) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: isUser ? '#6366f1' : 'rgba(56, 189, 248, 0.2)',
                            color: isUser ? '#fff' : '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isUser ? <User size={16} /> : <Bot size={16} />}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isUser ? '#a5b4fc' : '#38bdf8' }}>
                                {isUser ? 'Resident Voice Input' : 'VaaniAI Assistant'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div style={{
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: isUser ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              color: '#ffffff',
                              fontSize: '0.92rem',
                              lineHeight: 1.5
                            }}>
                              {msg.content}
                            </div>

                            {/* Extracted metadata chips */}
                            {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                {msg.metadata.category && (
                                  <span className={`badge badge-${msg.metadata.category.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.68rem' }}>
                                    {msg.metadata.category}
                                  </span>
                                )}
                                {msg.metadata.priority && (
                                  <span className={`badge badge-${msg.metadata.priority.toLowerCase()}`} style={{ fontSize: '0.68rem' }}>
                                    {msg.metadata.priority}
                                  </span>
                                )}
                                {msg.metadata.ticket_number && (
                                  <span style={{ fontSize: '0.72rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                    Ticket: #{msg.metadata.ticket_number}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                Select a conversation session on the left to view messages.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive layout CSS */}
      <style>{`
        @media (min-width: 800px) {
          .history-layout {
            grid-template-columns: 320px 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
