# VerifyAI — AI-Powered Document & Image Verification Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-Serverless-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_CDN-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)](https://python.org/)

VerifyAI is an enterprise-grade, multi-tenant SaaS application designed for automated document verification, digital fraud detection, multi-device session management, and real-time document analysis streaming.

Powered by a FastAPI microservice architecture on the backend and a Next.js 14 (App Router) client application, VerifyAI offers a complete verification pipeline featuring Argon2id password security, Dual JWT token rotation, Google OAuth 2.0 Single Sign-On, Server-Sent Events (SSE) live updates, and a 100% theme-consistent (Light/Dark) design system.

---

## Table of Contents
1. [Key System Features](#key-system-features)
2. [System Architecture & Workflow Diagrams](#system-architecture--workflow-diagrams)
3. [Database Schema & Entity Relationship Diagram (ERD)](#database-schema--entity-relationship-diagram-erd)
4. [Tech Stack Specifications](#tech-stack-specifications)
5. [Comprehensive Directory Structure](#comprehensive-directory-structure)
6. [UI & UX Design System (Light/Dark Theme Parity)](#ui--ux-design-system-lightdark-theme-parity)
7. [Environment Variables Configuration](#environment-variables-configuration)
8. [Step-by-Step Installation & Setup Guide](#step-by-step-installation--setup-guide)
9. [Pre-Configured Seed Accounts](#pre-configured-seed-accounts)
10. [Complete REST & SSE API Reference](#complete-rest--sse-api-reference)
11. [Security Architecture & Hardening](#security-architecture--hardening)
12. [Troubleshooting & Frequently Asked Questions](#troubleshooting--frequently-asked-questions)

---

## Key System Features

### 1. SaaS Authentication & Multi-Device Session Security
* **Argon2id Password Hashing**: Utilizes `passlib[argon2]` with high memory-cost parameters (`time_cost=3`, `memory_cost=65536`) to protect against GPU and ASIC dictionary attacks.
* **Dual-Token JWT Security**:
  * **Access Token**: Short-lived (15 minutes) bearer token for endpoint authorization.
  * **Refresh Token**: Long-lived (7 days) token with automated client-side rotation to seamlessly maintain sessions.
* **Multi-Device Session Management**:
  * Tracks every logged-in device, recording user-agent, parsed device names (Desktop vs Mobile), IP address, creation timestamp, and last-active timestamp.
  * Offers targeted session revocation (`DELETE /api/auth/sessions/{id}`) and global single-click **"Logout All Devices"** (`POST /api/auth/logout-all`).
* **Google OAuth 2.0 Single Sign-On**:
  * One-click authentication with Google Identity.
  * Handles automated user creation, account linking, avatar sync, and safe `NULL` password handling for passwordless accounts.
* **OTP & Magic Link Password Reset**:
  * 6-digit email verification codes with expiration timers and resend cooldowns.
  * Secure single-use magic reset tokens with 30-minute expiration windows.

### 2. AI Document & Image Verification Pipeline
* **Multi-Format Processing**: Native support for `.pdf`, `.png`, `.jpg`, and `.jpeg` documents.
* **Cloud Storage CDN Integration**: Direct upload and storage via Cloudinary API with public URL generation, asset type classification, and cloud asset tagging.
* **Real-Time Progress Streaming (SSE)**:
  * Server-Sent Events stream (`/api/upload/stream/{job_id}`) broadcasting step-by-step verification state (`uploading` -> `ocr_analysis` -> `authenticity_scoring` -> `completed`).
* **Multi-Metric Authenticity Analysis**:
  * **Authenticity Score**: Detects digital tampering, font inconsistencies, and visual anomalies.
  * **Completeness Score**: Measures presence of mandatory document fields (signatures, dates, seal, tax IDs).
  * **Consistency Score**: Cross-verifies layout structure against standardized document templates.
  * **Overall Risk Assessment**: Automatically categorizes documents as `VERIFIED`, `NEEDS_REVIEW`, or `REJECTED`.

### 3. Responsive Ergonomic User Experience
* **100% Light & Dark Theme Parity**: Every component, modal, input field, divider, button, and table adjusts dynamically to Light and Dark modes.
* **Collapsible Ergonomic Sidebar**:
  * Synchronized layout reflow between sidebar width (`w-20` / `w-64`) and main workspace padding (`lg:pl-20` / `lg:pl-64`) using smooth CSS transitions (`transition-all duration-300`).
  * Mobile responsive drawer with backdrop blur and gesture close.
* **Interactive Document Inspection**: Integrated visual inspection viewer with zoom controls, bounding boxes, and metadata drawer.

### 4. Super Admin Management Portal
* Complete system oversight dashboard displaying global platform metrics (Total Users, Active Sessions, Total Verification Volume, System Health).
* User table listing account status (`ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `DISABLED`), admin flag status, and single-click role/status controls.

---

## System Architecture & Workflow Diagrams

### High-Level Component Topology

```mermaid
graph TD
    Client[Next.js 14 App Router Frontend] -->|REST API Requests| FastAPI[FastAPI Backend Engine]
    Client -->|SSE Event Source| FastAPI
    FastAPI -->|SQLAlchemy ORM| DB[(Neon Cloud PostgreSQL)]
    FastAPI -->|Cloudinary SDK| Cloudinary[Cloudinary CDN Storage]
    FastAPI -->|OAuth 2.0 Protocol| Google[Google OAuth Provider]
    FastAPI -->|Background Processing| AI[AI Document Verification Service]
```

### Document Verification Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Next.js Client
    participant API as FastAPI Backend
    participant Storage as Cloudinary CDN
    participant Engine as AI Verification Engine
    participant DB as Neon PostgreSQL

    User->>Frontend: Select & Upload File (.pdf/.png)
    Frontend->>API: POST /api/upload/ (multipart/form-data)
    API->>DB: Create Document Record (status: uploaded)
    API-->>Frontend: Return job_id
    Frontend->>API: Connect to SSE /api/upload/stream/{job_id}
    
    par Async Processing
        API->>Storage: Upload binary to Cloudinary CDN
        API-->>Frontend: SSE Stream Event (status: uploading, progress: 25%)
        API->>Engine: Run OCR & Feature Extraction
        API-->>Frontend: SSE Stream Event (status: verifying, progress: 65%)
        Engine->>Engine: Compute Authenticity, Completeness & Consistency Scores
        API->>DB: Save Verification Results & update status to completed
        API-->>Frontend: SSE Stream Event (status: completed, result: {scores})
    end
    
    Frontend->>User: Render Interactive Score Card & Visual Viewer
```

### Dual-Token Auth & Session Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as Next.js Frontend
    participant Auth as FastAPI Auth Route
    participant DB as Neon PostgreSQL

    User->>App: Enter Credentials (Email & Password)
    App->>Auth: POST /api/auth/login
    Auth->>DB: Query User & Verify Argon2id Password Hash
    Auth->>DB: Create Session Record (User-Agent, IP, Device Name)
    Auth-->>App: Return Access Token (15m) + Refresh Token (7d)
    
    Note over App: User browses app using Access Token header
    
    Note over App: Access Token Expires after 15 minutes
    App->>Auth: POST /api/auth/refresh (Refresh Token)
    Auth->>DB: Validate Session & Issue New Access Token
    Auth-->>App: Return New Access Token
```

---

## Database Schema & Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ sessions : "has active"
    users ||--o{ oauth_accounts : "links"
    users ||--o{ verification_tokens : "owns"
    users ||--o{ documents : "uploads"
    documents ||--o| verifications : "generates"

    users {
        int id PK
        string name
        string email UK
        string hashed_password
        boolean is_admin
        boolean is_email_verified
        string status
        string avatar_url
        datetime created_at
        datetime updated_at
        datetime last_login_at
    }

    sessions {
        int id PK
        int user_id FK
        string session_token UK
        string refresh_token UK
        string device_name
        string user_agent
        string ip_address
        boolean is_active
        datetime created_at
        datetime expires_at
        datetime last_used_at
    }

    oauth_accounts {
        int id PK
        int user_id FK
        string provider
        string provider_user_id
        datetime created_at
    }

    verification_tokens {
        int id PK
        int user_id FK
        string token UK
        string token_type
        datetime expires_at
        boolean is_used
        datetime created_at
    }

    documents {
        int id PK
        int user_id FK
        string filename
        string file_path
        string file_type
        int file_size
        string file_hash
        string cloudinary_public_id
        string cloudinary_url
        string cloudinary_resource_type
        string status
        datetime uploaded_at
    }

    verifications {
        int id PK
        int document_id FK
        float authenticity_score
        float completeness_score
        float consistency_score
        float overall_score
        string result
        string details
        string status
        datetime verified_at
    }
```

### Detailed Table Column Specifications

#### 1. `users` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | Primary Key, Auto Increment | Unique user identifier |
| `name` | `VARCHAR(100)` | Not Null | User's full name |
| `email` | `VARCHAR(150)` | Unique, Not Null, Indexed | Primary email address |
| `hashed_password` | `VARCHAR(255)` | Nullable | Argon2id password hash (NULL for OAuth-only users) |
| `is_admin` | `BOOLEAN` | Default `False` | Super Admin privileges flag |
| `is_email_verified`| `BOOLEAN` | Default `False` | Email verification status flag |
| `status` | `VARCHAR(30)` | Default `PENDING_VERIFICATION` | Account status (`ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`) |
| `avatar_url` | `VARCHAR(500)` | Nullable | Profile picture URL from OAuth or CDN |
| `created_at` | `DATETIME` | Default UTC | Account creation timestamp |
| `updated_at` | `DATETIME` | Default UTC, Auto Update | Last account update timestamp |
| `last_login_at` | `DATETIME` | Nullable | Timestamp of most recent authentication |

#### 2. `sessions` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | Primary Key, Auto Increment | Unique session identifier |
| `user_id` | `INTEGER` | Foreign Key (`users.id`), Not Null | Foreign key reference to owner user |
| `session_token` | `VARCHAR(255)` | Unique, Not Null | Unique session token identifier |
| `refresh_token` | `VARCHAR(255)` | Unique, Not Null | JWT Refresh token string |
| `device_name` | `VARCHAR(100)` | Default `Unknown Device` | Parsed client device name (e.g. Chrome on macOS) |
| `user_agent` | `VARCHAR(500)` | Nullable | Raw HTTP User-Agent string |
| `ip_address` | `VARCHAR(45)` | Nullable | Client IPv4 or IPv6 address |
| `is_active` | `BOOLEAN` | Default `True` | Session validity status |
| `created_at` | `DATETIME` | Default UTC | Session creation timestamp |
| `expires_at` | `DATETIME` | Not Null | Session expiration timestamp (7 days) |
| `last_used_at` | `DATETIME` | Default UTC | Timestamp of last API interaction |

#### 3. `documents` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | Primary Key, Auto Increment | Unique document record identifier |
| `user_id` | `INTEGER` | Foreign Key (`users.id`), Not Null | Foreign key reference to owner user |
| `filename` | `VARCHAR(255)` | Not Null | Original uploaded filename |
| `file_path` | `VARCHAR(500)` | Not Null | Local or temporary storage path |
| `file_type` | `VARCHAR(50)` | Not Null | MIME type (`application/pdf`, `image/png`) |
| `file_size` | `INTEGER` | Not Null | File size in bytes |
| `file_hash` | `VARCHAR(128)` | Not Null | SHA-256 hash of raw file payload |
| `cloudinary_url` | `VARCHAR(1000)` | Nullable | Hosted Cloudinary CDN URL |
| `status` | `VARCHAR(50)` | Default `uploaded` | Processing status (`uploaded`, `processing`, `completed`, `failed`) |
| `uploaded_at` | `DATETIME` | Default UTC | Document upload timestamp |

#### 4. `verifications` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | Primary Key, Auto Increment | Unique verification record identifier |
| `document_id` | `INTEGER` | Foreign Key (`documents.id`) | Foreign key reference to document |
| `authenticity_score`| `FLOAT` | Range `0.0 - 100.0` | Digital tampering & authenticity score |
| `completeness_score`| `FLOAT` | Range `0.0 - 100.0` | Mandatory field detection score |
| `consistency_score` | `FLOAT` | Range `0.0 - 100.0` | Document layout consistency score |
| `overall_score` | `FLOAT` | Range `0.0 - 100.0` | Weighted aggregate verification score |
| `result` | `TEXT` | Not Null | Verification status outcome (`VERIFIED`, `REJECTED`) |
| `details` | `TEXT` | Nullable | Formatted JSON analysis log details |
| `verified_at` | `DATETIME` | Default UTC | Verification completion timestamp |

---

## Tech Stack Specifications

### **Frontend Stack**
* **Framework**: Next.js 14.2 (App Router)
* **Language**: TypeScript 5.3
* **Styling**: Vanilla CSS Variables + Tailwind CSS 3.4
* **Icons**: `lucide-react`
* **HTTP & SSE**: Native Fetch API + `EventSource`
* **State Management**: React `AuthContext` + `ThemeContext`

### **Backend Stack**
* **Framework**: FastAPI 0.109 (Python 3.10+)
* **ASGI Server**: Uvicorn
* **Database ORM**: SQLAlchemy 2.0 with Neon PostgreSQL
* **Password Hashing**: Argon2id (`passlib[argon2]`)
* **Tokens**: PyJWT (`HS256`)
* **Validation**: Pydantic v2
* **Storage SDK**: Cloudinary Python SDK
* **Image Processing**: Pillow (PIL), PyMuPDF (`fitz`)

---

## Comprehensive Directory Structure

```text
Project-01/
├── README.md                          # Comprehensive Documentation
├── .env.example                       # Environment Variables Template
├── .env                               # Active Environment Configuration
├── backend/                           # FastAPI Microservice Backend
│   ├── app.py                         # FastAPI Application Entrypoint & CORS Setup
│   ├── requirements.txt               # Backend Python Dependencies
│   ├── database/
│   │   ├── db.py                      # SQLAlchemy Engine & Neon Session Local
│   │   └── init_db.py                 # Table Creation Utilities
│   ├── models/                        # SQLAlchemy Database Models
│   │   ├── __init__.py
│   │   ├── user.py                    # User & AccountStatus Models
│   │   ├── session.py                 # Multi-Device Session Model
│   │   ├── document.py                # Uploaded Document Model
│   │   ├── verification.py            # AI Verification Result Model
│   │   ├── oauth_account.py           # OAuth Provider Credentials Model
│   │   └── verification_token.py      # OTP & Password Reset Tokens Model
│   ├── routes/                        # REST API Router Modules
│   │   ├── auth.py                    # Authentication, Sessions, OAuth & OTP Routes
│   │   ├── upload.py                  # Document Upload & Real-Time SSE Stream Routes
│   │   ├── verification.py            # User Verification History & Detail Routes
│   │   └── admin.py                   # Super Admin Portal Routes
│   ├── services/                      # Core Business Logic Services
│   │   ├── auth_service.py            # Argon2id Hashing, JWT Token Generation & Rotation
│   │   ├── cloudinary_service.py      # Cloudinary API Media Upload Service
│   │   └── verification_service.py    # OCR, Authenticity & Fraud Scoring Pipeline
│   └── scripts/
│       └── reset_db.py                # Database Reset & Seeding Automation Script
│
└── frontend/                          # Next.js 14 Client Web Application
    ├── package.json                   # Dependencies & Scripts
    ├── next.config.ts                 # Next.js Configuration
    ├── tsconfig.json                  # TypeScript Compiler Configuration
    ├── app/                           # Next.js App Router Pages
    │   ├── layout.tsx                 # Root HTML Layout with Theme & Auth Providers
    │   ├── page.tsx                   # Public Landing Page & Feature Showcase
    │   ├── login/
    │   │   └── page.tsx               # Sign-In Page (Email/Password & Google OAuth)
    │   ├── register/
    │   │   └── page.tsx               # Registration & OTP Verification Step Flow
    │   ├── forgot-password/
    │   │   └── page.tsx               # Password Reset Request Page
    │   ├── reset-password/
    │   │   └── page.tsx               # New Password Submission Page
    │   ├── verify-email/
    │   │   └── page.tsx               # Email Verification Callback Page
    │   ├── auth/
    │   │   └── callback/page.tsx      # Google OAuth Redirect Handler Page
    │   ├── dashboard/
    │   │   └── page.tsx               # Document Upload & Real-Time Verification Workspace
    │   ├── history/
    │   │   └── page.tsx               # User Isolated Scan History Page
    │   ├── settings/
    │   │   └── security/page.tsx      # Password Change & Active Session Control Page
    │   └── admin/
    │       └── page.tsx               # Super Admin User & System Metrics Portal
    └── src/                           # Shared Components & Utilities
        ├── components/
        │   ├── AppLayout.tsx          # Main Workspace Wrapper (Synchronized Sidebar + Header)
        │   ├── Header.tsx             # Sticky Top Header Bar (User Pill, Mobile Menu, Theme Toggle)
        │   ├── Sidebar.tsx            # Collapsible Ergonomic Sidebar Navigation
        │   ├── DocumentResult.tsx     # Comprehensive Verification Results & Metrics Card
        │   ├── VisualViewer.tsx       # Document Bounding Box & Canvas Inspector
        │   ├── PdfViewerModal.tsx     # PDF Modal Viewer
        │   ├── auth/
        │   │   ├── PasswordInput.tsx  # Theme-Adaptive Password Input Component
        │   │   ├── PasswordStrengthMeter.tsx # Real-Time Password Strength Meter
        │   │   ├── GoogleAuthButton.tsx     # Styled Google SSO Action Button
        │   │   └── AuthDivider.tsx          # Form Divider Line
        │   └── ui/
        │       ├── ThemeToggle.tsx    # Sun/Moon Theme Toggle Switch Component
        │       ├── OverallBar.tsx     # Visual Score Progress Bar Component
        │       ├── ScoreCard.tsx      # Granular Metric Badge Component
        │       └── ProcessingCard.tsx # Animated Loading & SSE Status Card
        └── contexts/
            ├── AuthContext.tsx        # Global User State, Token Persistence & Login Logic
            └── ThemeContext.tsx       # System & Manual Light/Dark Theme Controller
```

---

## UI & UX Design System (Light/Dark Theme Parity)

VerifyAI enforces strict design tokens to ensure high visual quality and high contrast in both Light and Dark modes.

| Surface / Token | Light Mode Value | Dark Mode Value | Tailored Utility Class |
|---|---|---|---|
| **Page Background** | `#F8FAFC` (Slate 50) | `#020617` (Slate 950) | `bg-slate-50 dark:bg-slate-950` |
| **Card Containers** | `#FFFFFF` (White) | `#0F172A` (Slate 900) | `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800` |
| **Input Background**| `#F8FAFC` (Slate 50) | `#0F172A/80` | `bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80` |
| **Input Text** | `#0F172A` (Slate 900) | `#FFFFFF` (White) | `text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500` |
| **Primary Button** | `#4F46E5` (Indigo 600) | `#6366F1` (Indigo 500) | `bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25` |
| **Theme Toggle** | `#F1F5F9` (Slate 100) | `#0F172A` (Slate 900) | `bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800` |

---

## Environment Variables Configuration

Create a `.env` file in the root project directory:

```env
# -----------------------------------------------------------------------------
# DATABASE CONNECTION (Neon Cloud Serverless PostgreSQL)
# -----------------------------------------------------------------------------
DATABASE_URL=postgresql://neondb_owner:npg_1a98i4-v2_secret@ep-tight-base-12345.us-east-2.aws.neon.tech/neondb?sslmode=require

# -----------------------------------------------------------------------------
# JWT SECURITY SECRETS
# -----------------------------------------------------------------------------
JWT_ACCESS_SECRET=dev_access_secret_key_change_in_production_32chars!
JWT_REFRESH_SECRET=dev_refresh_secret_key_change_in_production_32chars!
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# -----------------------------------------------------------------------------
# CLOUDINARY MEDIA CDN STORAGE
# -----------------------------------------------------------------------------
CLOUDINARY_CLOUD_NAME=dv01xxxxxxxx
CLOUDINARY_API_KEY=684416840441xxx
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# -----------------------------------------------------------------------------
# GOOGLE OAUTH 2.0
# -----------------------------------------------------------------------------
GOOGLE_CLIENT_ID=684416840441-nkq7v4f250cci6hi8r2e8hn8g8olosgc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# -----------------------------------------------------------------------------
# SMTP EMAIL DELIVERY (Optional for Email OTPs & Magic Links)
# -----------------------------------------------------------------------------
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

---

## Step-by-Step Installation & Setup Guide

### 1. System Requirements
* **Python**: `3.10` or higher
* **Node.js**: `18.0` or higher (`npm`)
* **Git**: `2.30` or higher

### 2. Clone Repository & Setup Virtual Environment
```bash
# Clone repository
git clone https://github.com/hariharan1476/AI-Powered-Document-and-Image-Verification-Platform.git
cd AI-Powered-Document-and-Image-Verification-Platform

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python requirements
pip install -r backend/requirements.txt
```

### 3. Database Initialization & Seeding
Initialize Neon PostgreSQL tables and populate initial accounts:
```bash
python3 -m backend.scripts.reset_db
```

### 4. Running Backend Server
```bash
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```
* **Swagger API UI**: `http://localhost:8000/docs`
* **ReDoc UI**: `http://localhost:8000/redoc`

### 5. Running Frontend Web App
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
* **Client App**: `http://localhost:3000`

---

## Pre-Configured Seed Accounts

Executing `python3 -m backend.scripts.reset_db` provisions the following system accounts:

| Role | Email | Password | Privileges & Access |
|---|---|---|---|
| **Super Admin** | `hariharankrishnamoorthy1476@gmail.com` | `Admin@2026!Hari` | Full Access (User Management, Admin Portal, Verification) |
| **Demo User** | `demo@example.com` | `DemoUser@123` | Standard Verification Workspace & History Access |

---

## Complete REST & SSE API Reference

### 1. System Health

#### `GET /health`
* **Auth**: None
* **Response `200 OK`**:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

### 2. Authentication & Session Security

#### `POST /api/auth/login`
* **Auth**: None
* **Request Body**:
```json
{
  "email": "demo@example.com",
  "password": "DemoUser@123"
}
```
* **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": 2,
    "name": "Demo User",
    "email": "demo@example.com",
    "is_admin": false,
    "status": "ACTIVE"
  }
}
```

#### `POST /api/auth/register`
* **Auth**: None
* **Request Body**:
```json
{
  "name": "Alex Smith",
  "email": "alex@example.com",
  "password": "Password123!"
}
```
* **Response `201 Created`**:
```json
{
  "message": "User registered successfully. Verification code sent to email.",
  "user_id": 3,
  "email": "alex@example.com"
}
```

#### `POST /api/auth/verify-email`
* **Auth**: None
* **Request Query / Body**: `?token=123456`
* **Response `200 OK`**:
```json
{
  "message": "Email verified successfully. Account is now ACTIVE."
}
```

#### `POST /api/auth/refresh`
* **Auth**: None
* **Request Body**:
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```
* **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

#### `GET /api/auth/sessions`
* **Auth**: Required (`Authorization: Bearer <access_token>`)
* **Response `200 OK`**:
```json
[
  {
    "id": 12,
    "device_name": "Chrome on macOS",
    "ip_address": "127.0.0.1",
    "is_active": true,
    "created_at": "2026-09-08T06:40:00",
    "last_used_at": "2026-09-08T11:20:00"
  }
]
```

#### `DELETE /api/auth/sessions/{id}`
* **Auth**: Required (`Authorization: Bearer <access_token>`)
* **Response `200 OK`**:
```json
{
  "message": "Session revoked successfully"
}
```

#### `POST /api/auth/logout-all`
* **Auth**: Required (`Authorization: Bearer <access_token>`)
* **Response `200 OK`**:
```json
{
  "message": "All active sessions have been revoked"
}
```

---

### 3. Document Upload & AI Verification

#### `POST /api/upload/`
* **Auth**: Required (`Authorization: Bearer <access_token>`)
* **Form Payload**: `file` (`.pdf`, `.png`, `.jpg`)
* **Response `200 OK`**:
```json
{
  "message": "Verification job initiated",
  "job_id": "8f3b2a19-4c5e-49b1-8b2c-1d3e4f5a6b7c"
}
```

#### `GET /api/upload/stream/{job_id}`
* **Auth**: EventSource Connection
* **SSE Stream Payload**:
```text
data: {"status": "uploading", "progress": 20, "message": "Storing file on Cloudinary CDN"}
data: {"status": "ocr_analysis", "progress": 60, "message": "Extracting text and verifying authenticity"}
data: {"status": "completed", "progress": 100, "result": {"authenticity_score": 96.5, "completeness_score": 92.0, "consistency_score": 94.0, "overall_score": 94.2, "status": "VERIFIED"}}
```

---

### 4. Verification History

#### `GET /api/verification/history`
* **Auth**: Required (`Authorization: Bearer <access_token>`)
* **Response `200 OK`**:
```json
{
  "count": 1,
  "items": [
    {
      "id": 14,
      "filename": "passport_scan.png",
      "cloudinary_url": "https://res.cloudinary.com/dv01/image/upload/v12345/passport_scan.png",
      "uploaded_at": "2026-09-08T10:15:00",
      "verification": {
        "authenticity_score": 96.5,
        "completeness_score": 92.0,
        "consistency_score": 94.0,
        "overall_score": 94.2,
        "result": "VERIFIED"
      }
    }
  ]
}
```

---

### 5. Admin Management

#### `GET /api/admin/users`
* **Auth**: Required (`is_admin: true`)
* **Response `200 OK`**:
```json
{
  "total_users": 2,
  "users": [
    {
      "id": 1,
      "name": "Hariharan Krishnamoorthy (Admin)",
      "email": "hariharankrishnamoorthy1476@gmail.com",
      "is_admin": true,
      "status": "ACTIVE"
    }
  ]
}
```

---

## Security Architecture & Hardening

1. **Argon2id Password Storage**: High memory cost prevents GPU matrix acceleration dictionary attacks.
2. **Strict Multi-Tenant Data Isolation**: Database queries enforce `WHERE user_id = current_user.id` on all document and history requests.
3. **Prepared Statements**: SQLAlchemy 2.0 ORM parameterizes all SQL inputs to prevent SQL injection.
4. **Token Security**: Tokens are stored with SHA-256 signatures, preventing token forging and tampered payloads.

---

## Troubleshooting & Frequently Asked Questions

### Q: Why is `npm run dev` or `npm run build` throwing a module import error?
Ensure dependencies are installed inside `frontend/`:
```bash
cd frontend
npm install
npm run build
```

### Q: How do I resolve `SSL connection failed` with Neon PostgreSQL?
Verify `DATABASE_URL` ends with `?sslmode=require` in your `.env` file.

### Q: Why does Google OAuth redirect fail locally?
Ensure `GOOGLE_REDIRECT_URI` in `.env` matches `http://localhost:8000/api/auth/google/callback` and is registered in Google Cloud Console.

---

Copyright (c) 2026 VerifyAI Platform. All rights reserved.