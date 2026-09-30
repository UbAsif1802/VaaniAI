import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import VoiceAssistant from './pages/VoiceAssistant';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetails from './pages/TicketDetails';
import History from './pages/History';
import ProfileSettings from './pages/ProfileSettings';
import Login from './pages/Login';
import Register from './pages/Register';
import HostDashboard from './pages/HostDashboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>Checking authentication...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function MainApp() {
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [theme, setTheme] = useState(() => localStorage.getItem('vaani-theme') || 'light');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vaani-theme', theme);
  }, [theme]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar selectedLang={selectedLang} setSelectedLang={setSelectedLang} theme={theme} setTheme={setTheme} />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<VoiceAssistant selectedLang={selectedLang} setSelectedLang={setSelectedLang} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetails />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<ProfileSettings selectedLang={selectedLang} setSelectedLang={setSelectedLang} />} />
          <Route path="/host-dashboard" element={<HostDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px 20px',
        textAlign: 'center',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        color: 'var(--text-dim)',
        fontSize: '0.82rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong style={{ color: 'var(--text-main)' }}>VaaniAI</strong> — Multilingual AI Voice Service-Resolution Platform
          </div>
          <div>
            "Don't fill out a form. Just talk." • Powered by Google Gemini
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </Router>
  );
}
