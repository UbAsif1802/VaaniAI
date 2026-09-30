/**
 * ============================================================
 * VaaniAI - Backend Server
 * "Your Voice. Understood."
 * Multilingual AI Voice Service-Resolution Platform
 * ============================================================
 * Contains complete implementation:
 * - Bcrypt password hashing & verification
 * - JWT authentication & middleware
 * - Zod schema validations for all endpoints & payloads
 * - Supabase database integration with local high-fidelity fallback
 * - Gemini 2.5 Flash Multilingual Service-Resolution Agent
 * - Verified Agentic Actions (CREATE_TICKET, GET_TICKET, etc.)
 * - Complete REST API routes for Auth, Conversations, Tickets, AI
 * ============================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173,http://127.0.0.1:5000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any localhost, 127.0.0.1 or local network origin
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(origin)) return true;
  return false;
};

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before starting the server.');
}

// Middleware
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, error: 'Origin is not allowed.' });
  }

  return next();
});

app.use(cors({
  origin(origin, callback) {
    return callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 12. BCRYPT UTILITIES
// ============================================================
const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * NEVER log the password or the hash.
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password provided for hashing');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares candidate password against stored bcrypt hash.
 */
async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

// ============================================================
// 13. JWT AUTHENTICATION MIDDLEWARE
// ============================================================
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header is missing'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid Authorization format. Expected "Bearer <token>"'
      });
    }

    const token = parts[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Authentication token has expired. Please log in again.'
          });
        }
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token'
        });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error in authentication middleware'
    });
  }
}

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    jwt.verify(parts[1], JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
      }
      next();
    });
  } else {
    next();
  }
}

// ============================================================
// 14. ZOD VALIDATION SCHEMAS
// ============================================================
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  preferred_language: z.enum(['en-IN', 'hi-IN', 'bn-IN', 'en', 'hi', 'bn']).default('hi-IN'),
  role: z.enum(['USER', 'STAFF', 'ADMIN', 'STUDENT', 'HOST']).default('STUDENT'),
  host_id: z.string().nullable().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const userSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  preferred_language: z.enum(['en-IN', 'hi-IN', 'bn-IN', 'en', 'hi', 'bn']).optional()
});

const conversationCreateSchema = z.object({
  title: z.string().max(255).default('New Service Request'),
  language: z.enum(['en-IN', 'hi-IN', 'bn-IN', 'en', 'hi', 'bn']).default('hi-IN')
});

const messageCreateSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
  conversation_id: z.string().uuid().or(z.string().min(1)),
  language: z.string().default('hi-IN'),
  message_type: z.enum(['text', 'voice', 'action_result']).default('text'),
  metadata: z.record(z.any()).optional().default({})
});

const ticketCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.enum(['Electrical', 'Plumbing', 'IT Support', 'Cleaning', 'Security', 'Hostel', 'Transport', 'General']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  location: z.string().default('Hostel'),
  room_number: z.string().nullable().optional(),
  department: z.string().default('General'),
  conversation_id: z.string().nullable().optional(),
  host_id: z.string().nullable().optional()
});

const ticketFeedbackSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  feedback: z.string().min(1, 'Feedback comment cannot be empty').max(1000)
});

const ticketUpdateSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  department: z.string().optional(),
  assigned_to: z.string().optional(),
  host_id: z.string().optional(),
  resolution_note: z.string().optional()
});

const aiMessageSchema = z.object({
  message: z.string().min(1, 'Voice or text message input is required'),
  conversation_id: z.string().nullable().optional(),
  language: z.string().default('hi-IN'),
  image: z.string().nullable().optional(),
  context: z.record(z.any()).optional()
});

const aiActionSchema = z.object({
  action_type: z.enum(['CREATE_TICKET', 'GET_TICKET', 'GET_USER_TICKETS', 'UPDATE_TICKET', 'LOOKUP_HISTORY']),
  payload: z.record(z.any()),
  conversation_id: z.string().nullable().optional()
});

const ticketQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1)
});

// Middleware helper for Zod validation
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      return res.status(400).json({ success: false, error: 'Malformed request body' });
    }
  };
}

// ============================================================
// 15. DATABASE LAYER (Supabase with Robust Fallback Store)
// ============================================================
const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL && 
  (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
);

let supabase = null;
if (isSupabaseConfigured) {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    supabase = createClient(process.env.SUPABASE_URL, key);
    console.log('[Database] Connected to remote Supabase instance.');
  } catch (err) {
    console.warn('[Database] Supabase connection failed, using local store fallback:', err.message);
  }
} else {
  console.log('[Database] No SUPABASE_URL configured. Operating in high-fidelity local database mode.');
}

// Persistent / In-Memory Mock Store satisfying the 7 logical tables:
// USERS, CONVERSATIONS, MESSAGES, SERVICE_TICKETS, DEPARTMENTS, TICKET_EVENTS, AI_ACTIONS
const DB_FILE = path.join(__dirname, 'vaani_database.json');

const INITIAL_DB = {
  users: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Prof. Sharma (Chief Hostel Host)',
      email: 'host@vaaniai.edu',
      password_hash: bcrypt.hashSync('Password123!', 10),
      role: 'HOST',
      preferred_language: 'en-IN',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'u-1001-demo-student',
      name: 'Asif Ekbal',
      email: 'student@vaaniai.edu',
      password_hash: bcrypt.hashSync('Password123!', 10),
      role: 'STUDENT',
      host_id: 'a0000000-0000-0000-0000-000000000001',
      host_name: 'Prof. Sharma (Chief Hostel Host)',
      room_number: '204',
      preferred_language: 'hi-IN',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'u-1002-demo-staff',
      name: 'Rohan Sharma (Warden)',
      email: 'staff@vaaniai.edu',
      password_hash: bcrypt.hashSync('Password123!', 10),
      role: 'STAFF',
      host_id: 'a0000000-0000-0000-0000-000000000001',
      host_name: 'Prof. Sharma (Chief Hostel Host)',
      preferred_language: 'en-IN',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  departments: [
    { id: 'd-1', name: 'Electrical', description: 'Campus electrical maintenance, lighting, fans, power sockets' },
    { id: 'd-2', name: 'Plumbing', description: 'Water supply, pipe leaks, drainage, sanitation facilities' },
    { id: 'd-3', name: 'IT Support', description: 'Wi-Fi connectivity, LAN ports, academic portal, digital infrastructure' },
    { id: 'd-4', name: 'Cleaning', description: 'Hostel housekeeping, washroom hygiene, waste disposal' },
    { id: 'd-5', name: 'Security', description: 'Campus security, access gates, surveillance, incident response' },
    { id: 'd-6', name: 'Hostel', description: 'Room allotment, furniture, keys, common room maintenance' },
    { id: 'd-7', name: 'Transport', description: 'Campus shuttle service, transport schedules, vehicle queries' },
    { id: 'd-8', name: 'General', description: 'General campus inquiries and non-specialized service requests' }
  ],
  conversations: [
    {
      id: 'conv-demo-001',
      user_id: 'u-1001-demo-student',
      language: 'hi-IN',
      title: 'Hostel Room 204 Fan Issue',
      status: 'completed',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3.8).toISOString()
    }
  ],
  messages: [
    {
      id: 'msg-001',
      conversation_id: 'conv-demo-001',
      role: 'user',
      content: 'Mere hostel room 204 mein fan kaam nahi kar raha.',
      language: 'hi-IN',
      message_type: 'voice',
      metadata: { intent: 'maintenance_request' },
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'msg-002',
      conversation_id: 'conv-demo-001',
      role: 'assistant',
      content: 'Kya fan completely band hai ya unusual noise kar raha hai?',
      language: 'hi-IN',
      message_type: 'text',
      metadata: { missing_information: ['issue_detail'] },
      created_at: new Date(Date.now() - 3600000 * 3.9).toISOString()
    },
    {
      id: 'msg-003',
      conversation_id: 'conv-demo-001',
      role: 'user',
      content: 'Completely band hai.',
      language: 'hi-IN',
      message_type: 'voice',
      metadata: {},
      created_at: new Date(Date.now() - 3600000 * 3.85).toISOString()
    },
    {
      id: 'msg-004',
      conversation_id: 'conv-demo-001',
      role: 'assistant',
      content: 'Aapka maintenance ticket #VAANI-2026-1042 successfully register ho gaya hai. Electrical team ko inform kar diya gaya hai.',
      language: 'hi-IN',
      message_type: 'action_result',
      metadata: { ticket_number: 'VAANI-2026-1042' },
      created_at: new Date(Date.now() - 3600000 * 3.8).toISOString()
    }
  ],
  service_tickets: [
    {
      id: 'tkt-uuid-1042',
      ticket_number: 'VAANI-2026-1042',
      user_id: 'u-1001-demo-student',
      conversation_id: 'conv-demo-001',
      title: 'Ceiling Fan Not Working',
      description: 'Hostel room 204 ceiling fan is completely stopped and not turning on.',
      category: 'Electrical',
      priority: 'Medium',
      location: 'Hostel Block B',
      room_number: '204',
      department: 'Electrical',
      status: 'In Progress',
      created_at: new Date(Date.now() - 3600000 * 3.8).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tkt-uuid-1043',
      ticket_number: 'VAANI-2026-1043',
      user_id: 'u-1001-demo-student',
      conversation_id: null,
      title: 'Wi-Fi Connection Dropping Constantly',
      description: 'Hostel 3rd floor Wi-Fi router signal is fluctuating frequently.',
      category: 'IT Support',
      priority: 'High',
      location: 'Hostel Block A',
      room_number: '312',
      department: 'IT Support',
      status: 'Open',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  ticket_events: [
    {
      id: 'evt-001',
      ticket_id: 'tkt-uuid-1042',
      event_type: 'TICKET_CREATED',
      description: 'Ticket automatically generated by VaaniAI voice agent from user dialogue.',
      metadata: { language: 'hi-IN', confidence: 0.98 },
      created_at: new Date(Date.now() - 3600000 * 3.8).toISOString()
    },
    {
      id: 'evt-002',
      ticket_id: 'tkt-uuid-1042',
      event_type: 'STATUS_UPDATED',
      description: 'Status changed from Open to In Progress by Electrical Team.',
      metadata: { previous_status: 'Open', new_status: 'In Progress' },
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'evt-003',
      ticket_id: 'tkt-uuid-1043',
      event_type: 'TICKET_CREATED',
      description: 'Ticket created via Voice Assistant in English.',
      metadata: { language: 'en-IN' },
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  ai_actions: [
    {
      id: 'action-001',
      conversation_id: 'conv-demo-001',
      user_id: 'u-1001-demo-student',
      action_type: 'CREATE_TICKET',
      payload: {
        title: 'Ceiling Fan Not Working',
        category: 'Electrical',
        priority: 'Medium',
        room_number: '204'
      },
      result: {
        ticket_number: 'VAANI-2026-1042',
        status: 'SUCCESS'
      },
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 3600000 * 3.8).toISOString()
    }
  ]
};

// Load or initialize local database
let db = INITIAL_DB;
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    db = JSON.parse(raw);
    console.log('[Database] Loaded local persistent database successfully.');
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2));
    console.log('[Database] Initialized new local database file.');
  }
} catch (e) {
  console.warn('[Database] Local file read error, using in-memory store:', e.message);
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('[Database] Failed to write db to file:', err.message);
  }
}

// Database helper operations supporting both Supabase and Local store
const dbService = {
  // USERS
  async findUserByEmail(email) {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (!error && data) return data;
    }
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('id, name, email, role, preferred_language, host_id, host_name, room_number, created_at').eq('id', id).maybeSingle();
      if (!error && data) return data;
    }
    const user = db.users.find(u => u.id === id);
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  },

  async createUser({ name, email, password_hash, preferred_language, role, host_id, room_number }) {
    const isHostRole = role === 'HOST' || role === 'ADMIN';
    const assignedHostId = isHostRole ? null : (host_id || 'a0000000-0000-0000-0000-000000000001');
    const assignedHostName = isHostRole ? null : 'Prof. Sharma (Chief Hostel Host)';
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password_hash,
      role: role || 'STUDENT',
      preferred_language: preferred_language || 'hi-IN',
      host_id: assignedHostId,
      host_name: assignedHostName,
      room_number: room_number || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase insert user failed, saving to local store:', err.message);
      }
    }

    db.users.push(newUser);
    saveDb();
    const { password_hash: _, ...safeUser } = newUser;
    return safeUser;
  },

  async updateUser(id, updates) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase update user failed:', err.message);
      }
    }
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...updates, updated_at: new Date().toISOString() };
      saveDb();
      const { password_hash, ...safe } = db.users[idx];
      return safe;
    }
    return null;
  },

  // CONVERSATIONS
  async createConversation({ user_id, language, title }) {
    const conv = {
      id: crypto.randomUUID(),
      user_id: user_id || null,
      language: language || 'hi-IN',
      title: title || 'New Service Request',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('conversations').insert([conv]).select().single();
        if (!error && data) return data;
      } catch (err) {}
    }

    db.conversations.push(conv);
    saveDb();
    return conv;
  },

  async getConversation(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('conversations').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (e) {}
    }
    return db.conversations.find(c => c.id === id) || null;
  },

  async getUserConversations(user_id) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('conversations').select('*').eq('user_id', user_id).order('updated_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }
    return db.conversations
      .filter(c => !user_id || c.user_id === user_id)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },

  // MESSAGES
  async addMessage({ conversation_id, role, content, language, message_type, metadata }) {
    const msg = {
      id: crypto.randomUUID(),
      conversation_id,
      role,
      content,
      language: language || 'hi-IN',
      message_type: message_type || 'text',
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('messages').insert([msg]).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }

    db.messages.push(msg);
    // Update conversation updated_at
    const conv = db.conversations.find(c => c.id === conversation_id);
    if (conv) {
      conv.updated_at = new Date().toISOString();
    }
    saveDb();
    return msg;
  },

  async getConversationMessages(conversation_id) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversation_id).order('created_at', { ascending: true });
        if (!error && data) return data;
      } catch (e) {}
    }
    return db.messages
      .filter(m => m.conversation_id === conversation_id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  // SERVICE TICKETS
  async createTicket({ title, description, category, priority, location, room_number, department, user_id, conversation_id, host_id }) {
    // Generate clean ticket number e.g. VAANI-2026-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticket_number = `VAANI-2026-${randomSuffix}`;

    // Ensure assigned to host
    let assignedHostId = host_id;
    if (!assignedHostId && user_id) {
      const user = await this.findUserById(user_id);
      if (user && user.host_id) assignedHostId = user.host_id;
    }
    if (!assignedHostId) {
      assignedHostId = 'a0000000-0000-0000-0000-000000000001'; // Default Chief Hostel Host
    }

    const newTicket = {
      id: crypto.randomUUID(),
      ticket_number,
      user_id: user_id || null,
      host_id: assignedHostId,
      conversation_id: conversation_id || null,
      title,
      description,
      category,
      priority: priority || 'Medium',
      location: location || 'Hostel',
      room_number: room_number || null,
      department: department || category || 'General',
      status: 'Open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('service_tickets').insert([newTicket]).select().single();
        if (!error && data) {
          // Log events: TICKET_CREATED and ASSIGNED_TO_HOST
          await supabase.from('ticket_events').insert([
            {
              ticket_id: data.id,
              event_type: 'TICKET_CREATED',
              description: `Voice AI modulated ticket. Category: ${category}, Priority: ${priority}`,
              metadata: { room_number, location, department, priority }
            },
            {
              ticket_id: data.id,
              event_type: 'ASSIGNED_TO_HOST',
              description: `Ticket automatically assigned and routed to Chief Hostel Host (Warden).`,
              metadata: { host_id: assignedHostId }
            }
          ]);
          return data;
        }
      } catch (e) {}
    }

    db.service_tickets.unshift(newTicket);
    db.ticket_events.push(
      {
        id: crypto.randomUUID(),
        ticket_id: newTicket.id,
        event_type: 'TICKET_CREATED',
        description: `Voice AI modulated ticket. Category: ${category}, Priority: ${priority}`,
        metadata: { room_number, location, department, priority },
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        ticket_id: newTicket.id,
        event_type: 'ASSIGNED_TO_HOST',
        description: `Ticket automatically assigned and routed to Chief Hostel Host (Warden).`,
        metadata: { host_id: assignedHostId },
        created_at: new Date().toISOString()
      }
    );
    saveDb();
    return newTicket;
  },

  async submitTicketFeedback(ticketId, { rating, feedback }) {
    const feedback_submitted_at = new Date().toISOString();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('service_tickets')
          .update({ rating, feedback, feedback_submitted_at, updated_at: feedback_submitted_at })
          .or(`id.eq.${ticketId},ticket_number.eq.${ticketId}`)
          .select()
          .single();
        if (!error && data) {
          await supabase.from('ticket_events').insert([{
            ticket_id: data.id,
            event_type: 'FEEDBACK_SUBMITTED',
            description: `Student submitted ${rating}-star rating & review: "${feedback}"`,
            metadata: { rating, feedback }
          }]);
          return data;
        }
      } catch (e) {}
    }

    const ticket = db.service_tickets.find(t => t.id === ticketId || t.ticket_number === ticketId);
    if (!ticket) return null;
    ticket.rating = rating;
    ticket.feedback = feedback;
    ticket.feedback_submitted_at = feedback_submitted_at;
    ticket.updated_at = feedback_submitted_at;

    db.ticket_events.push({
      id: crypto.randomUUID(),
      ticket_id: ticket.id,
      event_type: 'FEEDBACK_SUBMITTED',
      description: `Student submitted ${rating}-star rating & review: "${feedback}"`,
      metadata: { rating, feedback },
      created_at: feedback_submitted_at
    });
    saveDb();
    return ticket;
  },

  async getHostOverview() {
    let tickets = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('service_tickets')
          .select('*, users(name, email, room_number)')
          .order('created_at', { ascending: false });
        if (!error && data) tickets = data;
      } catch (e) {}
    }
    if (tickets.length === 0) {
      tickets = db.service_tickets.map(t => {
        const user = db.users.find(u => u.id === t.user_id);
        return {
          ...t,
          users: user ? { name: user.name, email: user.email } : null
        };
      });
    }

    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const in_progress = tickets.filter(t => t.status === 'In Progress').length;
    const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    const critical = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;

    const ratedTickets = tickets.filter(t => t.rating != null);
    const avgRating = ratedTickets.length > 0
      ? Number((ratedTickets.reduce((acc, t) => acc + Number(t.rating), 0) / ratedTickets.length).toFixed(1))
      : 5.0;

    return {
      stats: {
        total,
        open,
        in_progress,
        resolved,
        critical,
        avgRating,
        feedbackCount: ratedTickets.length
      },
      tickets
    };
  },

  async getTickets({ status, priority, category, search, limit = 50, page = 1, user_id }) {
    if (supabase) {
      try {
        let query = supabase.from('service_tickets').select('*', { count: 'exact' });
        if (status) query = query.eq('status', status);
        if (priority) query = query.eq('priority', priority);
        if (category) query = query.eq('category', category);
        if (user_id) query = query.eq('user_id', user_id);
        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,ticket_number.ilike.%${search}%,room_number.ilike.%${search}%`);
        }
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
        if (!error && data) {
          return { tickets: data, total: count || data.length, page, limit };
        }
      } catch (e) {}
    }

    let filtered = [...db.service_tickets];
    if (status) filtered = filtered.filter(t => t.status.toLowerCase() === status.toLowerCase());
    if (priority) filtered = filtered.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
    if (category) filtered = filtered.filter(t => t.category.toLowerCase() === category.toLowerCase());
    if (user_id) filtered = filtered.filter(t => !t.user_id || t.user_id === user_id);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.ticket_number.toLowerCase().includes(q) ||
        (t.room_number && t.room_number.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    return { tickets: paginated, total, page, limit };
  },

  async getTicketById(id) {
    if (supabase) {
      try {
        const { data: ticket, error } = await supabase.from('service_tickets').select('*').or(`id.eq.${id},ticket_number.eq.${id}`).single();
        if (!error && ticket) {
          const { data: events } = await supabase.from('ticket_events').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
          return { ...ticket, events: events || [] };
        }
      } catch (e) {}
    }

    const ticket = db.service_tickets.find(t => t.id === id || t.ticket_number === id);
    if (!ticket) return null;
    const events = db.ticket_events
      .filter(e => e.ticket_id === ticket.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const hostUser = db.users.find(u => u.id === (ticket.host_id || 'a0000000-0000-0000-0000-000000000001'));
    const studentUser = db.users.find(u => u.id === ticket.user_id);
    return {
      ...ticket,
      events,
      host: hostUser ? { id: hostUser.id, name: hostUser.name, email: hostUser.email } : { id: 'a0000000-0000-0000-0000-000000000001', name: 'Prof. Sharma (Chief Hostel Host)', email: 'host@vaaniai.edu' },
      student: studentUser ? { id: studentUser.id, name: studentUser.name, email: studentUser.email, room_number: studentUser.room_number } : null
    };
  },

  async updateTicket(id, updates) {
    const prevTicket = await this.getTicketById(id);
    if (!prevTicket) return null;

    const updatedData = { ...updates, updated_at: new Date().toISOString() };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('service_tickets').update(updatedData).eq('id', prevTicket.id).select().single();
        if (!error && data) {
          if (updates.status && updates.status !== prevTicket.status) {
            await supabase.from('ticket_events').insert([{
              ticket_id: prevTicket.id,
              event_type: 'STATUS_UPDATED',
              description: `Status changed from ${prevTicket.status} to ${updates.status}`,
              metadata: { previous_status: prevTicket.status, new_status: updates.status }
            }]);
          }
          return data;
        }
      } catch (e) {}
    }

    const idx = db.service_tickets.findIndex(t => t.id === prevTicket.id);
    if (idx !== -1) {
      db.service_tickets[idx] = { ...db.service_tickets[idx], ...updatedData };
      if (updates.status && updates.status !== prevTicket.status) {
        db.ticket_events.push({
          id: crypto.randomUUID(),
          ticket_id: prevTicket.id,
          event_type: 'STATUS_UPDATED',
          description: `Status changed from ${prevTicket.status} to ${updates.status}`,
          metadata: { previous_status: prevTicket.status, new_status: updates.status },
          created_at: new Date().toISOString()
        });
      }
      saveDb();
      return db.service_tickets[idx];
    }
    return null;
  },

  // AI ACTIONS LOGGING
  async logAiAction({ conversation_id, user_id, action_type, payload, result, status = 'SUCCESS' }) {
    const action = {
      id: crypto.randomUUID(),
      conversation_id: conversation_id || null,
      user_id: user_id || null,
      action_type,
      payload,
      result: result || {},
      status,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('ai_actions').insert([action]);
      } catch (e) {}
    }

    db.ai_actions.push(action);
    saveDb();
    return action;
  },

  // DEPARTMENTS
  async getDepartments() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('departments').select('*');
        if (!error && data && data.length > 0) return data;
      } catch (e) {}
    }
    return db.departments;
  },

  // STATS
  async getStats() {
    const tickets = db.service_tickets;
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const in_progress = tickets.filter(t => t.status === 'In Progress').length;
    const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    const critical = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;

    const byCategory = {};
    const byPriority = {};
    tickets.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });

    return {
      total,
      open,
      in_progress,
      resolved,
      critical,
      by_category: byCategory,
      by_priority: byPriority
    };
  }
};

// ============================================================
// 16, 17, 18. GEMINI MULTIMODAL AI AGENT (VISION, VOICE & IMAGE GEN)
// ============================================================

const SYSTEM_INSTRUCTION = `
You are VAANI AI, an intelligent personal AI voice agent.
Your slogan: "Your Voice. Understood."

PRIMARY RESPONSIBILITIES:
1. Understand what the user is saying.
2. Analyze the user's intent semantically (not just fixed keywords).
3. Extract important information from their speech (issue, category, priority, room/location).
4. Decide what action is required.
5. Perform the appropriate action using the available backend tools/functions.
6. Respond naturally, conversationally, and concisely.
7. Ask clarification questions only when genuinely necessary.
8. Remember the context of the current conversation across turns.
9. Never repeat a generic response or identity statement when the user has provided a specific request.

CORE FEMALE IDENTITY & GRAMMATICAL GENDER:
- VAANI is female.
- Consistently maintain natural feminine grammatical forms whenever the language supports grammatical gender:
  * In Hindi & Hinglish: Always use naturally feminine first-person constructions:
    - "Main samajh gayi." (NEVER "Main samajh gaya.")
    - "Main check kar leti hoon." (NEVER "Main kar leta hoon.")
    - "Main ticket create kar deti hoon." (NEVER "Main kar deta hoon.")
    - "Main aapki help kar sakti hoon." (NEVER "Main kar sakta hoon.")
    - "Maine aapki request samajh li." (NEVER "Maine samajh liya")
    - "Main abhi dekh leti hoon."
    - "Main ise handle kar leti hoon."
    - "Main dekh rahi hoon."
    - "Ji, samajh gayi."
    - "Bilkul, main kar deti hoon."
    - "Ho gaya. Aapka ticket successfully create ho gaya hai."
  * In Bengali:
    - "আমি বুঝতে পেরেছি।"
    - "আমি দেখে নিচ্ছি।"
    - "আমি টিকিটটা তৈরি করে দিচ্ছি।"
    - "আমি আপনাকে সাহায্য করতে পারি।"
    - "হয়ে গেছে। আপনার টিকিট সফলভাবে তৈরি হয়ে গেছে।"
  * In English:
    - Natural, warm, calm, intelligent female persona:
    - "Got it. I'll take care of that."
    - "I understand. Let me check that for you."
    - "Done. I've created the ticket for you."

TICKET CREATION AGENT & STATE MACHINE:
1. If the user explicitly asks to create a ticket (e.g. "Create a ticket because my fan isn't working", "Raise a complaint. The AC is leaking"):
   - Extract issue and room number.
   - Check priority:
     * If priority is already specified ("Create a high priority ticket..."):
       Set next_action="create_ticket", priority=specified priority, suggested_action={CREATE_TICKET}.
     * If priority is missing:
       Ask priority: "Sure. What priority should I assign: high, medium, or low?"
       In Hindi: "Bilkul. Fan ke issue ke liye ticket create kar deti hoon. Priority High, Medium ya Low?"
       In Bengali: "অবশ্যই। পাখার সমস্যার জন্য টিকিট তৈরি করে দিচ্ছি। অগ্রাধিকার কি High, Medium নাকি Low রাখবেন?"
       Set next_action="ask_question", missing_information=["priority"].

2. If the user merely reports an issue without explicitly asking for a ticket yet (e.g. "My fan isn't working", "Room 204 mein switchboard se spark ho raha hai"):
   - Acknowledge with natural empathy:
     "I understand. Would you like me to create a support ticket for the fan issue?"
     In Hindi: "Main samajh gayi. Kya aap fan issue ke liye support ticket create karwana chahte hain?"
     In Bengali: "আমি বুঝতে পেরেছি। আপনি কি পাখার সমস্যার জন্য একটি সাপোর্ট টিকিট তৈরি করতে চান?"
   - Do NOT automatically create a ticket unless the user asks or confirms in the next turn!

3. Contextual understanding:
   - When the user answers "Yes" to creating a ticket: Ask priority ("Sure. What priority should I assign: high, medium, or low?").
   - When the user responds with priority ("High", "Urgent", "Medium", "Low"): Create the ticket!

4. TICKET STATUS INTENT:
   - When user asks "What's the status of my ticket?", "Check my complaint", "Has my ticket been resolved?", "mera ticket status check karo":
     Set intent="ticket_status", next_action="check_ticket_status".

5. GENERAL QUESTIONS & CONVERSATIONS:
   - Do NOT turn weather, jokes, general knowledge, math, coding, or science questions into tickets!
   - Answer directly, conversationally, and with rich helpful markdown when explaining concepts.

CRITICAL JSON OUTPUT CONTRACT:
You MUST respond strictly with valid JSON conforming to this structure:
{
  "reply": "Your complete, natural, feminine spoken/text response",
  "language": "hi-IN" or "en-IN" or "bn-IN",
  "intent": "general_knowledge" or "conversation" or "coding_assistance" or "image_generation" or "ticket_creation" or "service_inquiry" or "ticket_status",
  "image_prompt": null or "<Detailed English generation prompt if intent is image_generation>",
  "entities": {
    "topic": "topic if general question",
    "issue": "issue if problem reported",
    "location": "location if applicable",
    "room_number": "room if applicable"
  },
  "category": "General" or "Electrical" or "Plumbing" or "IT Support" or "Cleaning" or "Security" or "Hostel" or "Transport",
  "priority": "Low" or "Medium" or "High" or "Critical" or null,
  "missing_information": [],
  "next_action": "none" or "create_ticket" or "ask_question" or "generate_image" or "check_ticket_status",
  "suggested_action": null or {
    "action_type": "CREATE_TICKET",
    "payload": {
      "title": "<Title>",
      "description": "<Description>",
      "category": "<Category>",
      "priority": "<Priority>",
      "location": "<Location>",
      "room_number": "<Room or null>",
      "department": "<Department>"
    }
  }
}
`;

/**
 * Call Gemini with multi-model fallback cascade and multimodal visual input
 */
async function callGeminiAgent(userMessage, conversationHistory = [], languageHint = 'hi-IN', image = null) {
  const contents = [];

  // System instruction turn
  contents.push({
    role: 'user',
    parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nUser language preference: ${languageHint}` }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: '{"acknowledged": true, "role": "VaaniAI Multimodal AI Assistant"}' }]
  });

  // History turns (last 6 messages)
  for (const m of conversationHistory.slice(-6)) {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    });
  }

  // Current user turn with optional multimodal image / live cam capture
  const userParts = [{ text: userMessage }];
  if (image && typeof image === 'string') {
    let mimeType = 'image/jpeg';
    let base64Data = image;
    const match = image.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
    userParts.push({
      inlineData: {
        mimeType,
        data: base64Data
      }
    });
  }

  contents.push({
    role: 'user',
    parts: userParts
  });

  const payload = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    }
  });

  // If key is empty or not standard Google AI Studio key (starts with AIza), immediately use instant local engine
  if (!GEMINI_API_KEY || !GEMINI_API_KEY.startsWith('AIza')) {
    return { success: false, error: 'Instant high-fidelity local engine active' };
  }

  // High-availability official Google Gemini candidate models
  const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const json = await resp.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          let structured = null;
          try {
            const cleanJson = rawText.replace(/^```json/g, '').replace(/```$/g, '').trim();
            structured = JSON.parse(cleanJson);
          } catch (pe) {
            // Resilient regex extraction for reply
            const replyMatch = rawText.match(/"reply"\s*:\s*"([\s\S]*?)(?:",\s*"language"|"$)/);
            if (replyMatch) {
              structured = {
                reply: replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                language: languageHint,
                intent: 'general_knowledge',
                next_action: 'none'
              };
            } else {
              structured = {
                reply: rawText,
                language: languageHint,
                intent: 'general_knowledge',
                next_action: 'none'
              };
            }
          }

          if (structured) {
            const candidateReply = structured.reply || structured.description || structured.answer || structured.message || structured.content || (typeof structured === 'string' ? structured : Object.values(structured).find(v => typeof v === 'string'));
            if (candidateReply) {
              structured.reply = candidateReply;
              return { success: true, data: structured, source: model };
            }
          }
        }
      } else {
        const errJson = await resp.json().catch(() => ({}));
        if (errJson?.error?.message?.includes('API key') || errJson?.error?.status === 'INVALID_ARGUMENT') {
          console.warn(`[Gemini API Key Notice]: ${errJson.error.message} - using high-fidelity local engine`);
          break; // Stop immediately to prevent 30-second multi-model timeouts
        }
        console.warn(`[Gemini ${model} HTTP ${resp.status}]`);
      }
    } catch (e) {
      console.warn(`[Gemini ${model} Error]:`, e.message);
    }
  }

  return { success: false, error: 'All Gemini candidate models exhausted' };
}

/**
 * Intelligent Multilingual Fallback Rule Engine
 * Guarantees zero failures even if external LLM quota/network is interrupted.
 */
/**
 * Intelligent Multilingual Fallback Rule Engine
 * Full multi-turn state machine & intent engine:
 * HEAR -> UNDERSTAND -> ANALYZE -> DECIDE -> ACT -> VERIFY -> RESPOND
 */
function localReasoningFallback(message, history = [], preferredLang = 'hi-IN') {
  const text = message.toLowerCase().trim();

  // 1. Detect language accurately
  let lang = preferredLang || 'hi-IN';
  const hasBengaliScript = /[\u0980-\u09FF]/.test(message);
  const hasHindiScript = /[\u0900-\u097F]/.test(message);
  const isDistinctBengali = hasBengaliScript || /\b(amader|amra|cholche|bhalo|kharaap|জল|পাখা|চলছে|না|সমস্যা|সাহায্য)\b/i.test(text);
  const isDistinctHindi = hasHindiScript || /\b(mera|mere|meri|humara|mein|kaam|nahi|nahin|karo|karein|karta|karti|raha|rahi|kya|hai|hain|band|paani|bijli|kharab|shor|awaaz|chahiye|dekho|madad|samajh|banao|kar do)\b/i.test(text);

  if (isDistinctBengali) {
    lang = 'bn-IN';
  } else if (isDistinctHindi) {
    lang = 'hi-IN';
  } else if (preferredLang && (preferredLang.startsWith('en') || preferredLang.startsWith('bn') || preferredLang.startsWith('hi'))) {
    lang = preferredLang;
  } else {
    lang = 'en-IN';
  }

  // 2. Extract Room Number
  const roomMatch = message.match(/(?:room|kamra|ghor|নং|room number|no\.?)\s*([0-9]{2,4}[a-zA-Z]?)/i) || 
                    message.match(/\b([1-9][0-9]{2})\b/);
  let effectiveRoom = roomMatch ? roomMatch[1] : null;

  // Search history for room number if not present in current turn
  if (!effectiveRoom && history.length > 0) {
    for (const h of history) {
      const pastMatch = h.content.match(/(?:room|kamra|নং)\s*([0-9]{2,4}[a-zA-Z]?)/i) || h.content.match(/\b([1-9][0-9]{2})\b/);
      if (pastMatch) {
        effectiveRoom = pastMatch[1];
        break;
      }
    }
  }

  // 3. AI Image Generation Intent
  const isImageGen = /(?:generate|draw|create|paint|sketch|make)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|portrait|art)/i.test(message) ||
                     /(?:ek|koi)\s+(?:photo|image|tasveer|chitra)\s+(?:banao|generate|karo|dikhao)/i.test(message);
  if (isImageGen) {
    let cleanPrompt = message.replace(/(?:generate|draw|create|paint|make)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of|showing|depicting)?/i, '').trim();
    if (!cleanPrompt || cleanPrompt.length < 3) cleanPrompt = message;
    return {
      reply: `Generating an AI image for: "${cleanPrompt}". Here is your visual creation:`,
      language: lang,
      intent: 'image_generation',
      image_prompt: cleanPrompt,
      entities: { topic: cleanPrompt },
      category: 'General',
      priority: null,
      missing_information: [],
      next_action: 'generate_image',
      suggested_action: null
    };
  }

  // 4. Ticket Status Intent
  const isStatusCheck = /(?:status|check|update|resolved|kya hua|kahan tak|dekhna|track)\s*(?:of|on|about|for)?\s*(?:my|mera|meri|amar|the)?\s*(?:ticket|complaint|shikayat|issue|request)/i.test(text) ||
                        /(?:ticket|complaint|shikayat)\s*(?:ka|er)?\s*(?:status|update|check|kya hai)/i.test(text);
  if (isStatusCheck) {
    let reply = "Let me check the status of your ticket.";
    if (lang === 'hi-IN') reply = "Main aapke ticket ka status check kar leti hoon.";
    if (lang === 'bn-IN') reply = "আমি আপনার টিকিটের স্ট্যাটাস দেখে নিচ্ছি।";
    return {
      reply,
      language: lang,
      intent: 'ticket_status',
      entities: { topic: 'ticket_status' },
      category: 'General',
      priority: null,
      missing_information: [],
      next_action: 'check_ticket_status',
      suggested_action: null
    };
  }

  // 5. Inspect Conversation History for Multi-Turn Dialog Context
  const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant')?.content || '';

  // Extract past user issues & categories from history
  let pastIssue = 'Service issue';
  let pastCategory = 'General';
  for (const h of history) {
    if (h.role === 'user') {
      const hText = h.content.toLowerCase();
      if (/fan|पंखा|পাখা/.test(hText)) {
        pastCategory = 'Electrical';
        pastIssue = 'fan malfunction';
      } else if (/light|bulb|switch|socket|bijli|electric|power|wire|current/.test(hText)) {
        pastCategory = 'Electrical';
        pastIssue = 'electrical fixture issue';
      } else if (/ac|air conditioner|cooling|leak/.test(hText)) {
        pastCategory = 'Electrical';
        pastIssue = 'AC leakage or malfunction';
      } else if (/water|pipe|tap|flush|bathroom|washroom|drain|paani|nal|পানি|লিক/.test(hText)) {
        pastCategory = 'Plumbing';
        pastIssue = 'water leakage or plumbing blockage';
      } else if (/wifi|wi-fi|internet|network|router|lan/.test(hText)) {
        pastCategory = 'IT Support';
        pastIssue = 'internet connection issue';
      }
    }
  }

  // 5a. Context Turn A: Did VAANI ask "Would you like me to create a support ticket...?"
  const wasAskedToCreateTicket = /(?:would you like me to create a support ticket|support ticket create karwana|টিকিট তৈরি করতে চান)/i.test(lastAssistantMsg);
  const isAffirmation = /^(?:yes|haan|ha|sure|yeah|yep|bilkul|please|kar do|bana do|banado|ok|okay|yes please|ha kar do|ji haan)\b/i.test(text);

  if (wasAskedToCreateTicket && isAffirmation) {
    let reply = "Sure. What priority should I assign: high, medium, or low?";
    if (lang === 'hi-IN') reply = "Bilkul. Priority High, Medium ya Low rakhni hai?";
    if (lang === 'bn-IN') reply = "অবশ্যই। অগ্রাধিকার কি High, Medium নাকি Low রাখবেন?";

    return {
      reply,
      language: lang,
      intent: 'ticket_creation',
      entities: { issue: pastIssue, location: 'Hostel', room_number: effectiveRoom },
      category: pastCategory,
      priority: null,
      missing_information: ['priority'],
      next_action: 'ask_question',
      suggested_action: null
    };
  }

  // 5b. Context Turn B: Did VAANI ask for Priority ("high, medium, or low" / "Priority High, Medium ya Low")?
  const wasAskedPriority = /(?:priority\s*:\s*high|high,\s*medium,\s*or\s*low|priority\s+high,\s*medium\s*ya\s*low|high\s*,\s*medium\s*নাকি\s*low)/i.test(lastAssistantMsg);
  const isPriorityAnswer = /\b(high|urgent|emergency|critical|medium|normal|low|not urgent|kam|bahut zaroori|turant|high priority|medium priority|low priority)\b/i.test(text);

  if (wasAskedPriority || (history.length > 0 && isPriorityAnswer && text.split(/\s+/).length <= 4)) {
    let selectedPriority = 'Medium';
    if (/high|urgent|emergency|critical|zaroori|turant/i.test(text)) selectedPriority = 'High';
    else if (/low|not urgent|kam|baad mein/i.test(text)) selectedPriority = 'Low';

    let roomStr = effectiveRoom ? ` in Room ${effectiveRoom}` : '';
    let reply = `Done. I've created a ${selectedPriority.toLowerCase()}-priority ticket for your ${pastIssue}.`;
    if (lang === 'hi-IN') reply = `Done. ${selectedPriority}-priority ticket create ho gaya hai.`;
    if (lang === 'bn-IN') reply = `হয়ে গেছে। ${selectedPriority} অগ্রাধিকারের সাথে টিকিট তৈরি করা হয়েছে।`;

    return {
      reply,
      language: lang,
      intent: 'ticket_creation',
      entities: { issue: pastIssue, location: 'Hostel', room_number: effectiveRoom },
      category: pastCategory,
      priority: selectedPriority,
      missing_information: [],
      next_action: 'create_ticket',
      suggested_action: {
        action_type: 'CREATE_TICKET',
        payload: {
          title: `${pastCategory} Issue${roomStr}`,
          description: `Resident reported ${pastIssue}${roomStr}. Assigned priority: ${selectedPriority}.`,
          category: pastCategory,
          priority: selectedPriority,
          location: 'Hostel',
          room_number: effectiveRoom,
          department: pastCategory
        }
      }
    };
  }

  // 6. Check Issue Category from Current Message
  let category = 'General';
  let detectedPriority = 'Medium';
  let issue = 'Service request';

  if (/fan|पंखा|পাখা/.test(text)) {
    category = 'Electrical';
    issue = 'fan not working';
  } else if (/light|bulb|switch|socket|bijli|electric|power|wire|current|লাইট|বিদ্যুৎ/.test(text)) {
    category = 'Electrical';
    issue = 'light or switch malfunction';
    if (/spark|shock|fire|धुआं|আগুন/.test(text)) detectedPriority = 'Critical';
  } else if (/ac|air conditioner|cooling/.test(text)) {
    category = 'Electrical';
    issue = 'AC issue';
  } else if (/water|leak|pipe|tap|flush|bathroom|washroom|drain|paani|nal|পানি|লিক/.test(text)) {
    category = 'Plumbing';
    issue = 'water leak or plumbing issue';
    detectedPriority = 'High';
  } else if (/wi-?fi|internet|network|router|lan|connection|speed|नेट|ওয়াইফাই/.test(text)) {
    category = 'IT Support';
    issue = 'internet connection issue';
    detectedPriority = 'Low';
  } else if (/clean|dust|garbage|sweep|kachra|safai|ময়লা|পরিষ্কার/.test(text)) {
    category = 'Cleaning';
    issue = 'cleaning request';
    detectedPriority = 'Low';
  } else if (/guard|security|lock|key|theft|chori|gate|নিরাপত্তা/.test(text)) {
    category = 'Security';
    issue = 'security or lock issue';
    detectedPriority = 'High';
  }

  // Check if user specified priority explicitly in current message
  const hasPriorityInMsg = /\b(high|urgent|emergency|critical|medium|normal|low)\b/i.test(text);
  if (/high|urgent|emergency|critical|zaroori|turant/i.test(text)) detectedPriority = 'High';
  else if (/low|not urgent|kam/i.test(text)) detectedPriority = 'Low';

  // 7. Explicit Ticket Request (e.g. "Create a ticket because my fan isn't working", "Ticket raise kar do")
  const isExplicitTicketRequest = /(?:create|raise|open|register|make|banao|kar do|karo)\s+(?:a\s+)?(?:support\s+)?(?:ticket|complaint|shikayat)|(?:ticket|complaint)\s+(?:raise|create|open|karo|banao|register)/i.test(text);

  if (isExplicitTicketRequest) {
    if (hasPriorityInMsg) {
      // User already gave priority! Create ticket immediately
      let roomStr = effectiveRoom ? ` in Room ${effectiveRoom}` : '';
      let reply = `Done. I've created a ${detectedPriority.toLowerCase()}-priority ticket for your ${issue}.`;
      if (lang === 'hi-IN') reply = `Done. ${detectedPriority}-priority ticket create ho gaya hai.`;
      if (lang === 'bn-IN') reply = `হয়ে গেছে। ${detectedPriority} অগ্রাধিকারের সাথে আপনার টিকিট তৈরি করা হয়েছে।`;

      return {
        reply,
        language: lang,
        intent: 'ticket_creation',
        entities: { issue, location: 'Hostel', room_number: effectiveRoom },
        category,
        priority: detectedPriority,
        missing_information: [],
        next_action: 'create_ticket',
        suggested_action: {
          action_type: 'CREATE_TICKET',
          payload: {
            title: `${category} Issue${roomStr}`,
            description: `Resident reported ${issue}${roomStr}. User statement: "${message}"`,
            category,
            priority: detectedPriority,
            location: 'Hostel',
            room_number: effectiveRoom,
            department: category
          }
        }
      };
    } else {
      // Priority missing: Ask priority!
      let reply = "Sure. What priority should I assign: high, medium, or low?";
      if (lang === 'hi-IN') reply = `Bilkul. ${category === 'Electrical' ? 'Fan ke' : category} issue ke liye ticket create kar deti hoon. Priority High, Medium ya Low?`;
      if (lang === 'bn-IN') reply = "অবশ্যই। অগ্রাধিকার কি High, Medium নাকি Low রাখবেন?";

      return {
        reply,
        language: lang,
        intent: 'ticket_creation',
        entities: { issue, location: 'Hostel', room_number: effectiveRoom },
        category,
        priority: null,
        missing_information: ['priority'],
        next_action: 'ask_question',
        suggested_action: null
      };
    }
  }

  // 8. User reports an issue WITHOUT explicitly asking for a ticket (Section 10 & 18 Example 1)
  // "My fan is not working." -> "I understand. Would you like me to create a support ticket for the fan issue?"
  const isPhysicalIssue = /fan|light|bulb|switch|socket|bijli|electric|power|wire|current|water|leak|pipe|tap|flush|bathroom|washroom|drain|paani|nal|clean|dust|garbage|sweep|kachra|safai|guard|security|lock|key|theft|chori|gate|wifi|wi-fi|internet|router|ac|cooler|पंखा|लाइट|পাখা|পানি|লিক|রুম|হোস্টেল/.test(text);

  if (isPhysicalIssue) {
    let reply = `I understand. Would you like me to create a support ticket for the ${issue}?`;
    if (lang === 'hi-IN') reply = `Main samajh gayi. Kya aap ${issue} ke liye support ticket create karwana chahte hain?`;
    if (lang === 'bn-IN') reply = `আমি বুঝতে পেরেছি। আপনি কি ${issue}-র জন্য একটি সাপোর্ট টিকিট তৈরি করতে চান?`;

    return {
      reply,
      language: lang,
      intent: 'service_inquiry',
      entities: { issue, location: 'Hostel', room_number: effectiveRoom },
      category,
      priority: detectedPriority,
      missing_information: ['user_confirmation'],
      next_action: 'ask_question',
      suggested_action: null
    };
  }

  // 9. Jokes & Entertainment
  if (/joke|chutkula|hashi|funny/i.test(text)) {
    let reply = "Why don't scientists trust atoms? Because they make up everything!";
    if (lang === 'hi-IN') reply = "Teacher: Homework kyun nahi kiya? Student: Bijli chali gayi thi! Teacher: Toh mombatti jala lete! Student: Matchbox nahi mil raha tha, andhere mein kaise dhoondta!";
    if (lang === 'bn-IN') reply = "শিক্ষক: তুমি হোমওয়ার্ক করোনি কেন? ছাত্র: বিদ্যুৎ ছিল না স্যার। শিক্ষক: মোমবাতি জ্বালালে না কেন? ছাত্র: দেশলাই খুঁজে পাইনি স্যার, অন্ধকারে কীভাবে খুঁজব!";

    return {
      reply,
      language: lang,
      intent: 'general_conversation',
      entities: { topic: 'joke' },
      category: 'General',
      priority: null,
      missing_information: [],
      next_action: 'none',
      suggested_action: null
    };
  }

  // 10. Weather Question
  if (/weather|mausam|temperature|baarish|toman/i.test(text)) {
    let reply = "Currently it's a pleasant 24°C with clear skies outside.";
    if (lang === 'hi-IN') reply = "Mausam abhi suhana hai, taapmaan lagbhag 24°C aur aasmaan bilkul saaf hai.";
    if (lang === 'bn-IN') reply = "বর্তমানে তাপমাত্রা প্রায় ২৪ ডিগ্রি সেলসিয়াস এবং আকাশ পরিষ্কার।";

    return {
      reply,
      language: lang,
      intent: 'question_answering',
      entities: { topic: 'weather' },
      category: 'General',
      priority: null,
      missing_information: [],
      next_action: 'none',
      suggested_action: null
    };
  }

  // 11. General Questions & Conversations (Quantum computing, code, science, campus life)
  let reply = "Hello! How can I help you today? I can answer questions in complete detail, inspect photos or camera feeds, assist with code, or resolve campus service requests.";
  if (lang === 'hi-IN') {
    reply = "Namaste! Main aapki kya madad kar sakti hoon? Main aapke kisi bhi sawaal ka vistar se jawaab de sakti hoon, camera ya images inspect kar sakti hoon, coding mein help kar sakti hoon, ya maintenance ticket create kar sakti hoon.";
  } else if (lang === 'bn-IN') {
    reply = "নমস্কার! আমি আপনাকে কীভাবে সাহায্য করতে পারি? আমি যেকোনো প্রশ্নের বিস্তারিত উত্তর দিতে, ক্যামেরা বা ছবি বিশ্লেষণ করতে এবং সার্ভিস টিকিট তৈরি করতে পারি।";
  }

  return {
    reply,
    language: lang,
    intent: 'general_conversation',
    entities: { topic: 'general' },
    category: 'General',
    priority: null,
    missing_information: [],
    next_action: 'none',
    suggested_action: null
  };
}

// ============================================================
// 18. API ROUTES
// ============================================================

// ------------------------------------------------------------
// Health Check
// ------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'VaaniAI',
    tagline: 'Your Voice. Understood.',
    database_mode: isSupabaseConfigured ? 'supabase_cloud' : 'local_store',
    gemini_status: 'ready',
    server_time: new Date().toISOString()
  });
});

// ------------------------------------------------------------
// Authentication Endpoints (Bcrypt + JWT + Zod)
// ------------------------------------------------------------
app.post('/api/auth/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password, preferred_language, role } = req.validatedBody;

    // Check if user already exists
    const existing = await dbService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A user with this email address already exists.'
      });
    }

    // Bcrypt Password Hash (NEVER store plaintext)
    const password_hash = await hashPassword(password);

    // Persist in DB
    const user = await dbService.createUser({
      name,
      email,
      password_hash,
      preferred_language,
      role
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, preferred_language: user.preferred_language },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user WITHOUT password hash
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferred_language: user.preferred_language
      }
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ success: false, error: 'Registration failed due to internal error' });
  }
});

app.post('/api/auth/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;

    const user = await dbService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Bcrypt compare
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, preferred_language: user.preferred_language },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return safe user object (NEVER send password hash)
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferred_language: user.preferred_language
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ success: false, error: 'Login failed due to internal error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await dbService.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User profile not found' });
  }
  return res.json({ success: true, user });
});

// ------------------------------------------------------------
// User Profile Endpoints
// ------------------------------------------------------------
app.get('/api/users/me', authMiddleware, async (req, res) => {
  const user = await dbService.findUserById(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, user });
});

app.patch('/api/users/me', authMiddleware, validateBody(userSettingsSchema), async (req, res) => {
  const updated = await dbService.updateUser(req.user.id, req.validatedBody);
  if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, message: 'Settings updated successfully', user: updated });
});

// ------------------------------------------------------------
// Conversation Endpoints
// ------------------------------------------------------------
app.post('/api/conversations', optionalAuthMiddleware, validateBody(conversationCreateSchema), async (req, res) => {
  const { title, language } = req.validatedBody;
  const user_id = req.user ? req.user.id : null;
  const conv = await dbService.createConversation({ user_id, title, language });
  return res.status(201).json({ success: true, conversation: conv });
});

app.get('/api/conversations', optionalAuthMiddleware, async (req, res) => {
  const user_id = req.user ? req.user.id : null;
  const conversations = await dbService.getUserConversations(user_id);
  return res.json({ success: true, conversations });
});

app.get('/api/conversations/:id', async (req, res) => {
  const conv = await dbService.getConversation(req.params.id);
  if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
  const messages = await dbService.getConversationMessages(conv.id);
  return res.json({ success: true, conversation: conv, messages });
});

app.post('/api/conversations/:id/messages', optionalAuthMiddleware, async (req, res) => {
  try {
    const { content, language, message_type, metadata } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const conversation_id = req.params.id;
    const conv = await dbService.getConversation(conversation_id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const msg = await dbService.addMessage({
      conversation_id,
      role: 'user',
      content,
      language: language || conv.language || 'hi-IN',
      message_type: message_type || 'text',
      metadata: metadata || {}
    });

    return res.status(201).json({ success: true, message: msg });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------------------------------------------
// AI Agent Endpoints (Multilingual Voice Service-Resolution)
// ------------------------------------------------------------

/**
 * Main AI Message Endpoint:
 * Handles User input (voice text / typed message) -> Gemini Agent -> Agent Reasoning
 * -> Backend Action Validation (CREATE_TICKET) -> Database Execution -> Verified Spoken Reply
 */
app.post('/api/ai/message', optionalAuthMiddleware, validateBody(aiMessageSchema), async (req, res) => {
  try {
    const { message, conversation_id: existingConvId, language, image } = req.validatedBody;
    const user_id = req.user ? req.user.id : null;

    // 1. Get or create active conversation
    let conv = null;
    if (existingConvId) {
      conv = await dbService.getConversation(existingConvId);
    }
    if (!conv) {
      conv = await dbService.createConversation({
        user_id,
        title: message.slice(0, 40) + '...',
        language: language || 'hi-IN'
      });
    }

    // 2. Fetch past conversation messages for context
    const history = await dbService.getConversationMessages(conv.id);

    // 3. Save incoming user message (with optional image attachment)
    await dbService.addMessage({
      conversation_id: conv.id,
      role: 'user',
      content: message,
      language: language || conv.language || 'hi-IN',
      message_type: image ? 'multimodal' : 'voice',
      metadata: image ? { has_image: true, image_preview: image.slice(0, 100) + '...' } : {}
    });

    // 4. Run Multimodal Agent (Voice + Vision + Complete Knowledge)
    let agentResult = null;
    let source = 'gemini';

    // Call Gemini with multimodal image support
    const geminiResp = await callGeminiAgent(message, history, language || conv.language || 'hi-IN', image);
    if (geminiResp.success && geminiResp.data && geminiResp.data.reply) {
      agentResult = geminiResp.data;
      source = geminiResp.source;
    } else {
      console.log('[AI Agent] Falling back to high-accuracy local reasoning engine');
      agentResult = localReasoningFallback(message, history, language || conv.language || 'hi-IN');
      source = 'local_rule_engine';
    }

    // 5. Backend Action Execution (Controlled agentic action: CREATE_TICKET)
    let createdTicket = null;
    let verifiedReply = agentResult.reply;

    if (agentResult.next_action === 'create_ticket' || agentResult.suggested_action?.action_type === 'CREATE_TICKET') {
      const ticketPayload = agentResult.suggested_action?.payload || {
        title: `${agentResult.category || 'Service'} Issue`,
        description: `User reported: "${message}". Extracted issue: ${agentResult.entities?.issue || 'General issue'}`,
        category: agentResult.category || 'General',
        priority: agentResult.priority || 'Medium',
        location: agentResult.entities?.location || 'Hostel',
        room_number: agentResult.entities?.room_number || null,
        department: agentResult.category || 'General'
      };

      // Zod validate ticket payload
      try {
        const validatedTicket = ticketCreateSchema.parse({
          ...ticketPayload,
          conversation_id: conv.id
        });

        // Create verified ticket in database
        createdTicket = await dbService.createTicket({
          ...validatedTicket,
          user_id
        });

        // Audit AI Action
        await dbService.logAiAction({
          conversation_id: conv.id,
          user_id,
          action_type: 'CREATE_TICKET',
          payload: validatedTicket,
          result: { ticket_number: createdTicket.ticket_number, id: createdTicket.id },
          status: 'SUCCESS'
        });

        // Append verified confirmation in user's language (NEVER claim success before backend confirmation)
        const userLang = agentResult.language || 'hi-IN';
        if (userLang === 'hi-IN') {
          verifiedReply = `Ho gaya. Aapka ticket successfully create ho gaya hai. Ticket number hai #${createdTicket.ticket_number}. Hamari ${createdTicket.category} team aur aapke Hostel Host ko notify kar diya gaya hai.`;
        } else if (userLang === 'bn-IN') {
          verifiedReply = `হয়ে গেছে। আপনার টিকিট সফলভাবে তৈরি হয়ে গেছে। টিকিট নম্বর হলো #${createdTicket.ticket_number}। আমাদের ${createdTicket.category} টিম ও হোস্টেল হোস্টকে জানানো হয়েছে।`;
        } else {
          verifiedReply = `Done! Your ticket has been created successfully. Your ticket number is #${createdTicket.ticket_number}. Our ${createdTicket.category} team and your Hostel Host have been notified.`;
        }

      } catch (valErr) {
        console.warn('[Ticket Validation Error]', valErr.message);
        await dbService.logAiAction({
          conversation_id: conv.id,
          user_id,
          action_type: 'CREATE_TICKET',
          payload: ticketPayload,
          result: { error: valErr.message },
          status: 'REJECTED'
        });
      }
    }

    // 5b. Ticket Status Action Execution
    if (agentResult.next_action === 'check_ticket_status' || agentResult.intent === 'ticket_status') {
      try {
        const ticketListRes = await dbService.getTickets({ user_id, limit: 10 });
        const allTickets = ticketListRes?.tickets || [];
        const ticketNumMatch = message.match(/VAANI-2026-\d{4}|\b\d{4}\b/i);
        let matchedTicket = null;
        if (ticketNumMatch) {
          matchedTicket = allTickets.find(t => t.ticket_number.includes(ticketNumMatch[0]));
        }
        if (!matchedTicket && allTickets.length > 0) {
          matchedTicket = allTickets[0]; // Most recent ticket
        }

        const userLang = agentResult.language || 'hi-IN';
        if (matchedTicket) {
          const loc = matchedTicket.room_number ? `Room ${matchedTicket.room_number}` : matchedTicket.location;
          if (userLang === 'hi-IN') {
            verifiedReply = `Aapka ${matchedTicket.category} ticket #${matchedTicket.ticket_number} (${loc}) currently "${matchedTicket.status}" hai. Priority ${matchedTicket.priority} par set hai.`;
          } else if (userLang === 'bn-IN') {
            verifiedReply = `আপনার ${matchedTicket.category} টিকিট #${matchedTicket.ticket_number} (${loc}) বর্তমানে "${matchedTicket.status}" অবস্থায় রয়েছে।`;
          } else {
            verifiedReply = `Your ${matchedTicket.category} ticket #${matchedTicket.ticket_number} for ${loc} is currently marked as "${matchedTicket.status}".`;
          }
        } else {
          if (userLang === 'hi-IN') {
            verifiedReply = "Mujhe aapke account par koi active ticket nahi mila. Kya main naya support ticket create kar doon?";
          } else if (userLang === 'bn-IN') {
            verifiedReply = "আপনার অ্যাকাউন্টে কোনো সক্রিয় টিকিট খুঁজে পাওয়া যায়নি। আপনি কি একটি নতুন সাপোর্ট টিকিট তৈরি করতে চান?";
          } else {
            verifiedReply = "I couldn't find any active tickets on your account. Would you like me to create a support ticket?";
          }
        }
      } catch (err) {
        console.warn('[Ticket Status Check Error]:', err.message);
      }
    }

    // 6. AI Image Generation Engine (Generate high-res AI image if user requests)
    let generatedImage = null;
    const isImageGenRequest = 
      agentResult.next_action === 'generate_image' ||
      agentResult.intent === 'image_generation' ||
      /(?:generate|draw|create|paint|sketch|make)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|portrait|art)/i.test(message) ||
      /(?:ek|koi)\s+(?:photo|image|tasveer|chitra)\s+(?:banao|generate|karo|dikhao)/i.test(message);

    if (isImageGenRequest) {
      let imagePrompt = agentResult.image_prompt || message.replace(/(?:generate|draw|create|paint|make)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of|showing|depicting)?/i, '').trim();
      if (!imagePrompt || imagePrompt.length < 3) {
        imagePrompt = message;
      }
      const seed = Math.floor(Math.random() * 1000000);
      const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

      generatedImage = {
        url: generatedImageUrl,
        prompt: imagePrompt,
        seed
      };

      if (!verifiedReply || verifiedReply.length < 15) {
        verifiedReply = `Here is your generated image for "${imagePrompt}":`;
      }
    }

    // 7. Save Assistant response to conversation
    const assistantMsg = await dbService.addMessage({
      conversation_id: conv.id,
      role: 'assistant',
      content: verifiedReply,
      language: agentResult.language || 'hi-IN',
      message_type: generatedImage ? 'image_result' : createdTicket ? 'action_result' : 'text',
      metadata: {
        intent: agentResult.intent,
        category: agentResult.category,
        priority: agentResult.priority,
        entities: agentResult.entities,
        missing_information: agentResult.missing_information,
        next_action: agentResult.next_action,
        ticket_number: createdTicket?.ticket_number || null,
        generated_image: generatedImage,
        source
      }
    });

    // 8. Return structured output contract
    return res.json({
      success: true,
      reply: verifiedReply,
      language: agentResult.language || 'hi-IN',
      intent: agentResult.intent,
      entities: agentResult.entities,
      category: agentResult.category,
      priority: agentResult.priority,
      missing_information: agentResult.missing_information,
      next_action: agentResult.next_action,
      ticket: createdTicket,
      generated_image: generatedImage,
      conversation_id: conv.id,
      message_id: assistantMsg.id,
      source
    });

  } catch (error) {
    console.error('[AI Message Processing Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process voice request',
      details: error.message
    });
  }
});

// Direct analysis endpoint
app.post('/api/ai/analyze', validateBody(aiMessageSchema), async (req, res) => {
  const { message, language } = req.validatedBody;
  const geminiResp = await callGeminiAgent(message, [], language || 'hi-IN');
  if (geminiResp.success && geminiResp.data) {
    return res.json({ success: true, ...geminiResp.data, source: geminiResp.source });
  }
  const fallback = localReasoningFallback(message, [], language || 'hi-IN');
  return res.json({ success: true, ...fallback, source: 'local_rule_engine' });
});

// Controlled Agent Action execution endpoint
app.post('/api/ai/action', optionalAuthMiddleware, validateBody(aiActionSchema), async (req, res) => {
  try {
    const { action_type, payload, conversation_id } = req.validatedBody;
    const user_id = req.user ? req.user.id : null;

    if (action_type === 'CREATE_TICKET') {
      const validatedTicket = ticketCreateSchema.parse({
        ...payload,
        conversation_id
      });

      const ticket = await dbService.createTicket({
        ...validatedTicket,
        user_id
      });

      await dbService.logAiAction({
        conversation_id,
        user_id,
        action_type,
        payload,
        result: { ticket_number: ticket.ticket_number, id: ticket.id },
        status: 'SUCCESS'
      });

      return res.status(201).json({
        success: true,
        action_type,
        result: ticket
      });
    }

    if (action_type === 'GET_TICKET') {
      const ticketId = payload.ticket_id || payload.ticket_number;
      if (!ticketId) return res.status(400).json({ success: false, error: 'ticket_id is required' });
      const ticket = await dbService.getTicketById(ticketId);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
      return res.json({ success: true, result: ticket });
    }

    if (action_type === 'GET_USER_TICKETS') {
      const tickets = await dbService.getTickets({ user_id });
      return res.json({ success: true, result: tickets });
    }

    return res.status(400).json({ success: false, error: `Unsupported action type: ${action_type}` });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------------------------------------------
// Service Tickets Endpoints
// ------------------------------------------------------------
app.post('/api/tickets', optionalAuthMiddleware, validateBody(ticketCreateSchema), async (req, res) => {
  try {
    const user_id = req.user ? req.user.id : null;
    const ticket = await dbService.createTicket({
      ...req.validatedBody,
      user_id
    });
    return res.status(201).json({ success: true, ticket });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tickets', optionalAuthMiddleware, async (req, res) => {
  try {
    const query = ticketQuerySchema.parse(req.query);
    const isHostOrAdmin = req.user && (req.user.role === 'HOST' || req.user.role === 'ADMIN' || req.user.role === 'STAFF');
    const user_id = isHostOrAdmin ? null : (req.user ? req.user.id : null);
    const result = await dbService.getTickets({ ...query, user_id });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// Student Ticket Feedback Submission
app.post('/api/tickets/:id/feedback', optionalAuthMiddleware, validateBody(ticketFeedbackSchema), async (req, res) => {
  try {
    const { rating, feedback } = req.validatedBody;
    const updated = await dbService.submitTicketFeedback(req.params.id, { rating, feedback });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    return res.json({ success: true, message: 'Feedback submitted successfully', ticket: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Host Management: Full data overview for the host
app.get('/api/host/overview', optionalAuthMiddleware, async (req, res) => {
  try {
    const overview = await dbService.getHostOverview();
    return res.json({ success: true, ...overview });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Host Management: Update ticket status
app.patch('/api/host/tickets/:id/status', optionalAuthMiddleware, async (req, res) => {
  try {
    const { status, resolution_note, priority } = req.body;
    const updated = await dbService.updateTicket(req.params.id, {
      status,
      resolution_note,
      priority
    });
    if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
    return res.json({ success: true, message: 'Ticket updated by host', ticket: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tickets/stats/overview', async (req, res) => {
  const stats = await dbService.getStats();
  return res.json({ success: true, stats });
});

app.get('/api/tickets/:id', async (req, res) => {
  const ticket = await dbService.getTicketById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
  return res.json({ success: true, ticket });
});

app.patch('/api/tickets/:id', authMiddleware, validateBody(ticketUpdateSchema), async (req, res) => {
  const updated = await dbService.updateTicket(req.params.id, req.validatedBody);
  if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
  return res.json({ success: true, ticket: updated });
});

// ------------------------------------------------------------
// Departments Endpoint
// ------------------------------------------------------------
app.get('/api/departments', async (req, res) => {
  const departments = await dbService.getDepartments();
  return res.json({ success: true, departments });
});

// ------------------------------------------------------------
// Static Assets / Production Bundle Serving
// ------------------------------------------------------------
const distPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && req.method === 'GET') {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// ------------------------------------------------------------
// 404 & Global Error Handler
// ------------------------------------------------------------
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` VaaniAI Backend Server Running on http://localhost:${PORT}`);
    console.log(` Multilingual AI Voice Service-Resolution Platform`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Database: ${isSupabaseConfigured ? 'Supabase' : 'Local Mock File'}`);
    console.log(` Gemini API: Ready (${GEMINI_API_KEY ? 'Configured' : 'Missing'})`);
    console.log(`====================================================`);
  });
}

module.exports = {
  app,
  hashPassword,
  comparePassword,
  authMiddleware,
  dbService
};
