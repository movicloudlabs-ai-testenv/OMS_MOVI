# 🏢 Office Workspace Management System (OWMS / OMS)

A role-based enterprise workspace platform that unifies **System Administration, Human Resources (HR), the Project Management Office (PMO), Employees, and Interns** into one system. Each role logs into an isolated, permission-scoped environment for managing people, projects, tasks, attendance, leave, learning, and onboarding.

---

## 🛠️ Tech Stack

**Frontend**
- **React 18** + **Vite** (fast HMR, optimized production builds)
- **React Router v6** — role-based client-side routing with route guards
- **Tailwind CSS** — custom design system
- **Recharts** — dashboards & analytics
- **Framer Motion** — animations/transitions
- **react-hot-toast** — notifications, **date-fns** — date formatting
- **Axios** — API client with JWT interceptor
- **lucide-react** + Google Material Symbols — iconography

**Backend**
- **Node.js** + **Express.js** — RESTful API
- **MongoDB** + **Mongoose 8** — data layer with schema validation
- **JWT** (access + refresh) — authentication
- **helmet**, **express-rate-limit**, **cors** — security hardening
- **express-validator** — request validation
- **multer** — file uploads, **nodemailer** — transactional email
- **pdfkit** + **xlsx** — report/export generation

---

## 🔐 Roles

| Role slug      | Label          | Scope |
|----------------|----------------|-------|
| `super-admin` / `admin` | Administrator | Users, roles, departments, access matrix, audit logs, settings, reports |
| `hr-manager`   | HR Manager     | Employees, interns, onboarding, attendance, leave, HR task board, learning |
| `pmo-lead`     | PMO Lead       | Projects, project teams, task assignment, monitoring, approvals, reports |
| `employee`     | Employee       | Own tasks, projects, team, attendance, leave, profile |
| `intern`       | Intern         | Own tasks, learning resources, attendance, leave, profile |

Authorization is enforced by a dynamic **Role-Based Access Control (RBAC) Access Matrix** — admins toggle CRUD permissions per role per module, and both the API (middleware) and the UI (route guards + permission gates) respect it.

---

## ✨ Key Features

### Core workflows
- **Projects (PMO):** create projects, assign an HR representative, build an isolated project team from the company directory, and manage deliverables on a project-scoped Kanban board with effort points, priorities, and health status (On Track / At Risk / Delayed).
- **Tasks:** lifecycle `Todo → In Progress → In Review → Done` (with a `Blocked` state). PMO/HR assign work; employees/interns execute and submit for review; PMO approves or requests changes.
- **People (HR):** employee & intern directory, onboarding checklists, attendance, leave requests/approvals, performance reviews, and learning-resource assignment.
- **Leave & attendance:** requests flow to HR and/or the PMO project manager for approval.

### In-app notifications
- A **notification bell** (all roles except admin) with unread count, polling every 30s, and a redesigned dropdown (type icons, relative time, responsive).
- **Per-nav red dots** on sidebar items showing unseen activity per section; they clear when the user visits that page. Backed by a shared `NotificationContext`.

### Self-service profiles
- Every role has a working "My Profile" page backed by `/api/me/profile` (name, username, avatar, bio, links, contact, password change).

### Safe user offboarding
- Deleting a user runs an **offboarding cascade**: an impact preview (managed projects, team memberships, open tasks), a **required replacement manager** for any project they lead, removal from all team rosters, their open tasks flagged **"Needs reassignment"**, and notifications to the affected managers/HR. The user is then **soft-deleted** (records preserved).
- The PMO task board surfaces **"Needs reassign"** tasks (badge + banner + one-click reassign).
- A **startup self-heal** scrubs any lingering references to already-deleted users from project rosters and open tasks.

---

## 🏗️ Project Structure

```text
OMS/
├── backend/
│   ├── server.js                # Entry point (DB connect, permission sync, startup jobs)
│   └── src/
│       ├── config/              # DB connection, env validation, seed scripts
│       ├── controllers/         # Route logic, grouped by role (admin/ hr/ pmo/ employee/ intern/)
│       ├── models/              # Mongoose schemas (User, Role, Project, Task, Notification, …)
│       ├── routes/              # Express routers, mounted per role namespace
│       ├── middleware/          # auth (JWT), rbac, scoping, upload, audit, error handling
│       └── utils/               # notifications, email, tokens, cleanup jobs
└── frontend/
    ├── public/                  # Static assets + _redirects (SPA fallback)
    └── src/
        ├── api/ + utils/api.js  # Axios instances & endpoint definitions
        ├── components/          # Reusable UI (Header, Sidebar, Modal, dialogs, gates)
        ├── contexts/            # AuthContext, NotificationContext
        ├── pages/               # Role-scoped views (admin/ hr/ pmo/ employee/ intern/)
        ├── routes/              # ProtectedRoute (role + permission guards)
        └── App.jsx              # Router + route protection
```

**API namespaces** (backend mounts): `/api/auth`, `/api/me`, `/api/notifications`, `/api/admin/*`, `/api/hr/*`, `/api/pmo/*`, `/api/employee/*`, `/api/intern/*`.

---

## ⚙️ Local Setup

**Prerequisites:** Node.js v18+ and a MongoDB instance (local or Atlas).

```bash
git clone <repository-url>
cd OMS
```

### 1. Backend
```bash
cd backend
npm install
```
Create `backend/.env` (see `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/owms

JWT_SECRET=replace_with_a_long_random_secret_min_32_chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
JWT_REFRESH_EXPIRE=30d

# CORS: the frontend origin
FRONTEND_URL=http://localhost:5173
# Used to build links in emails (usually same as FRONTEND_URL)
APP_URL=http://localhost:5173

BCRYPT_ROUNDS=12
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Optional — email (password reset / welcome emails)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=you@example.com
# EMAIL_PASS=your_app_password
```
Seed data and run:
```bash
npm run seed        # seed roles, departments, demo data
npm run seed:users  # seed user accounts
npm run dev         # start with nodemon (http://localhost:5000)
```

### 2. Frontend
```bash
cd frontend
npm install
```
Create `frontend/.env` (see `.env.example`):
```env
VITE_API_URL=http://localhost:5000/api
```
```bash
npm run dev   # http://localhost:5173
```

---

## 🚀 Deployment (Render)

Deployed as **two services**: a backend **Web Service** and a frontend **Static Site**.

### Backend (Web Service)
- Build: `npm install` · Start: `npm start`
- Environment variables:
  ```
  NODE_ENV=production
  MONGO_URI=<MongoDB Atlas connection string>
  JWT_SECRET=<random 32+ chars>
  JWT_REFRESH_SECRET=<different random 32+ chars>
  FRONTEND_URL=https://<your-frontend>.onrender.com   # exact origin, no trailing slash
  APP_URL=https://<your-frontend>.onrender.com
  ```
  (plus optional `EMAIL_*`). Do **not** set `PORT` — Render provides it.

### Frontend (Static Site)
- Build: `npm install && npm run build` · Publish directory: `dist`
- Environment variable (baked in at **build** time — rebuild after changing):
  ```
  VITE_API_URL=https://<your-backend>.onrender.com/api
  ```
- **SPA routing:** add a rewrite rule so refresh on any route works:
  `Source: /*  →  Destination: /index.html  →  Action: Rewrite`
  (a `public/_redirects` file with `/* /index.html 200` is included as a fallback)

**Cross-link to remember:** `VITE_API_URL` (frontend) points at the backend; `FRONTEND_URL` (backend) points at the frontend — a mismatch causes CORS / "Network Error".

---

## 📊 Core Data Models
- **User** — credentials, role & department refs, profile, onboarding checklist, employment/intern fields; soft-deleted via `deletedAt`.
- **Role / Permission** — the dynamic RBAC access matrix.
- **Project** — metadata, manager (PMO), HR rep, `team[]` & `interns[]` rosters, milestones, health status.
- **Task** — title, priority, effort points, status, `project` + `assignedTo`/`assignedBy` refs, `needsReassignment` flag, status history.
- **Notification** — per-recipient in-app notifications with type, link, read state.
- Plus **Attendance, LeaveRequest, LeaveBalance, LearningResource, Department, AuditLog, Report, Settings**.

---

## 📌 Project Status & Roadmap

**Working:** auth + RBAC, admin (users/roles/departments/access matrix/audit/reports), HR (employees/interns/onboarding/attendance/leave/tasks/learning), PMO (projects/tasks/team/monitoring/approvals), employee & intern workspaces, in-app notifications, self-service profiles, user offboarding cascade.

**Known gaps / next steps:**
- A few pages (Messages/Communication, Documents, Payments, Performance, Status) have frontend UI but no backend yet — to be built or removed.
- Consolidate the two frontend API clients (`api/` and `utils/api.js`) into one.
- Harden CORS (allow-list / return clean errors), add automated tests, and move file uploads to durable storage (uploads are ephemeral on Render's free tier).

---

## 🔒 Security Notes
- JWT auth with access + refresh tokens; passwords hashed with bcrypt.
- RBAC enforced on both API and UI; audit logging of critical actions.
- Helmet, rate limiting, and CORS configured; soft-delete preserves history and frees emails for reuse.

---

## © Ownership

© 2026 **Movi Cloud Labs**. All rights reserved. This project and its source code are proprietary to Movi Cloud Labs.
