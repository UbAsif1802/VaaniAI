# VaaniAI — Your Voice. Understood.
### Multilingual AI Voice Service-Resolution Platform

> **Product Promise:** *"Don't fill out a form. Just talk."*

VaaniAI is a state-of-the-art conversational voice resolution platform designed for campus, hostel, and institutional service requests. Users can speak naturally in **Hindi**, **English**, **Bengali**, or mixed languages (**Hinglish** / **Banglish**). 

VaaniAI does not just chat: it **Understands**, **Reasons**, and **Acts** by extracting structured parameters, determining category & priority, asking necessary clarifications, and performing controlled, verified database actions such as creating real service tickets.

---

## 🚀 Key Features & Architecture

```
User Voice / Text
       ↓
Browser Web Speech API (en-IN, hi-IN, bn-IN)
       ↓
Express.js Backend (server.js)
       ↓
Google Gemini (gemini-3.8-flash / gemini-3.1-flash-lite)
       ↓
Agentic Reasoning (Intent, Category, Priority, Entities, Missing Info)
       ↓
Backend Validation (Zod Validation & Authorization)
       ↓
Database Layer (Supabase PostgreSQL / Persistent Local High-Fidelity Store)
       ↓
Verified Action Confirmation (Ticket #VAANI-2026-XXXX)
       ↓
SpeechSynthesis API (Spoken Confirmation in User's Language)
```

### 1. Unified `server.js` Architecture
As requested, the entire backend functionality is unified and fully self-contained inside [`server.js`](file:///c:/Users/Asif%20Ekbal/OneDrive/Desktop/VaaniAI/server.js):
- **12. Bcrypt Requirement:** `hashPassword()` and `comparePassword()`. Plaintext passwords and hashes are never logged, stored in the clear, or returned to frontend. Also mirrored in [`utils/bcrypt.js`](file:///c:/Users/Asif%20Ekbal/OneDrive/Desktop/VaaniAI/utils/bcrypt.js).
- **13. JWT Requirement:** Bearer token authentication middleware verifying signatures and expiration, attaching `req.user`, protecting private routes. Also mirrored in [`middleware/authMiddleware.js`](file:///c:/Users/Asif%20Ekbal/OneDrive/Desktop/VaaniAI/middleware/authMiddleware.js).
- **14. Zod Validation:** Strict validation across Registration, Login, Conversations, Messages, AI Actions, Tickets, and Parameter queries.
- **15. Supabase Logical Schema:** 7 tables (`users`, `conversations`, `messages`, `service_tickets`, `departments`, `ticket_events`, `ai_actions`) with full DDL & RLS in [`schema.sql`](file:///c:/Users/Asif%20Ekbal/OneDrive/Desktop/VaaniAI/schema.sql), paired with an automated high-fidelity local persistent fallback so it works immediately out-of-the-box.
- **16. Gemini AI:** Configured exclusively through backend environment variables (`GEMINI_API_KEY`). The key is never exposed to the frontend or client-side JS.
- **17. Multilingual Service Agent:** Supports natural language understanding across English, Hindi, Bengali, and mixed phrases with intelligent context-awareness.
- **18. Structured AI Output:** Strict JSON output containing `reply`, `language`, `intent`, `entities`, `category`, `priority`, `missing_information`, and `suggested_action`.
- **Zero-Friction SPA Serving:** The Express server also serves the production-bundled React frontend directly on port 5000!

---

## ⚡ Quick Start

### 1. Install & Start
```bash
# In the project root directory
npm start
```
The server will start on: **`http://localhost:5000`**

Open your browser and navigate to **`http://localhost:5000`** to access the complete application!

Before deployment, run `npm run check` and build the frontend with `npm run build:frontend`.

### 2. Demo Evaluation Accounts
The app comes with pre-seeded 1-click accounts on the Login page:
- **Student Demo:** `student@vaaniai.edu` / `Password123!`
- **Staff / Warden Demo:** `staff@vaaniai.edu` / `Password123!`

---

## 🎙️ Hackathon Demo Scenarios

The Voice Assistant page features 1-click test chips matching the PRD specification:

1. **Main Hackathon Scenario (Hindi):**
   - **User Input:** *"Mere hostel room 204 mein fan kaam nahi kar raha."*
   - **AI Understanding:** Language: Hindi, Intent: maintenance_request, Room: 204, Category: Electrical, Priority: Medium.
   - **AI Clarification Question:** *"Main samajh gayi, room 204 mein fan kaam nahi kar raha hai. Kya fan bilkul band hai ya koi ajeeb awaaz kar raha hai?"*
   - **User Follow-up:** *"Completely band hai."*
   - **Backend Action:** Zod validates payload, creates real ticket record in database, logs `ai_actions` and `ticket_events`.
   - **Spoken Confirmation:** *"Aapka service ticket #VAANI-2026-XXXX successfully create ho gaya hai. Hamari Electrical team ko notify kar diya gaya hai."*

2. **English Scenario:**
   - **User Input:** *"My hostel room's Wi-Fi is extremely slow."*
   - **AI Response:** Categorizes as `IT Support`, Priority: `Low`, prompts for room number if not provided.

3. **Bengali Scenario:**
   - **User Input:** *"আমাদের হোস্টেল রুমে জলের পাইপ লিক করছে"*
   - **AI Response:** Categorizes as `Plumbing`, Priority: `High`, responds in Bengali and registers the ticket.

4. **Mixed Language (Hinglish):**
   - **User Input:** *"Room 204 ka fan is not working and light bhi flicker kar rahi hai."*
   - **AI Response:** Categorizes as `Electrical` with multiple issues in Room 204.

---

## 🛠️ Environment Configuration (`.env`)

```env
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5000

# Optional: Supabase credentials
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Copy [`.env.example`](.env.example) to `.env` and provide real values locally. Never commit `.env`; rotate any credential that was previously shared or committed.

---

## 📁 Repository Structure

```
VaaniAI/
├── server.js               # Primary all-in-one backend server & static host
├── schema.sql              # Supabase PostgreSQL schema with 7 tables & RLS
├── .env                    # Environment secrets (GEMINI_API_KEY, JWT_SECRET)
├── utils/
│   └── bcrypt.js           # Bcrypt hashing & verification utilities
├── middleware/
│   └── authMiddleware.js   # JWT authentication middleware
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/     # Navbar, ProtectedRoute
│   │   ├── pages/          # VoiceAssistant, Dashboard, Tickets, TicketDetails, History, Profile, Login, Register
│   │   ├── context/        # AuthContext
│   │   ├── services/       # Axios API client
│   │   ├── index.css       # Deep slate glassmorphism design system
│   │   └── App.jsx         # Routing configuration
│   └── dist/               # Production bundle served by Express
└── vaani_database.json     # Local persistent database store (Supabase fallback)
```

---

## 🔐 Security & Reliability Invariants

- **Backend-Only Secrets:** `GEMINI_API_KEY` and `JWT_SECRET` are never exposed to the client or browser.
- **Never Fake Action Success:** VaaniAI never claims an action succeeded until the backend database verifies and returns the real ticket ID.
- **Password Safety:** Raw passwords are never stored, logged, or returned in API responses.
