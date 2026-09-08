# 🛡️ VerifyAI — AI-Powered Document & Image Verification Platform

A modern, production-grade, SaaS-level application for document verification, fraud detection, multi-device authentication, and real-time document analytics. Built with **FastAPI**, **Next.js 14 (App Router)**, **Neon PostgreSQL**, **Cloudinary CDN**, **Argon2id Hashing**, **Dual JWT Rotation**, **Google OAuth 2.0**, and **Server-Sent Events (SSE)**.

---

## 📋 Table of Contents
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [💻 Tech Stack](#-tech-stack)
- [🎨 UI & UX Design System](#-ui--ux-design-system)
- [🔑 Environment Variables](#-environment-variables)
- [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
- [👤 Seeded System Accounts](#-seeded-system-accounts)
- [📡 Complete API Endpoint Reference](#-complete-api-endpoint-reference)
  - [1. System Health](#1-system-health)
  - [2. Authentication & Session Security](#2-authentication--session-security)
  - [3. Document Upload & AI Verification](#3-document-upload--ai-verification)
  - [4. Verification History](#4-verification-history)
  - [5. Admin Management](#5-admin-management)
- [🔄 Database Management & Seeding](#-database-management--seeding)
- [🔒 Security Architecture](#-security-architecture)

---

## ✨ Key Features

### 🔐 1. Enterprise SaaS Authentication Suite
- **Argon2id Password Hashing**: Ultra-secure password encryption resistant to GPU/ASIC brute-force attacks.
- **Dual JWT Token System**: Short-lived 15-minute Access Tokens + 7-day Refresh Tokens with automatic client-side rotation.
- **Multi-Device Session Security**: Real-time tracking of active browser sessions, IP addresses, device types, and single-click **"Logout All Devices"**.
- **Google OAuth 2.0 Integration**: Seamless Single Sign-On (SSO) with automatic user creation and NULL-password safety.
- **OTP & Email Verification**: 6-digit email verification OTPs and single-use magic reset links.

### 📄 2. AI Document & Image Verification Engine
- **Multi-Format Processing**: Supports `.pdf`, `.png`, `.jpg`, and `.jpeg` uploads.
- **Cloud Media Pipeline**: Secure direct upload and media hosting via **Cloudinary API**.
- **Real-Time Progress Streaming**: Live SSE stream (`/api/upload/stream/{job_id}`) broadcasting step-by-step verification progress (OCR extraction, authenticity scoring, consistency checks).
- **Comprehensive Score Matrix**: Returns granular metrics for **Authenticity**, **Completeness**, **Consistency**, and **Overall Risk Level**.

### 🎨 3. Modern Responsive Interface & Theme System
- **Dual Theme Support (Light & Dark)**: Full system-wide theme parity with seamless theme toggle across all dashboard, security, and authentication pages.
- **Collapsible Ergonomic Sidebar**: Smooth CSS transitions (`w-20` / `w-64`) synchronized with content padding (`lg:pl-20` / `lg:pl-64`) without void gaps or text clipping.
- **PDF & Image Inspection**: Interactive visual viewer with zoom controls, bounding boxes, and document metadata preview.

### 👑 4. Admin Management Dashboard
- **System Metrics & User Management**: Admin panel to monitor platform activity, user statuses (`ACTIVE`, `SUSPENDED`), roles, and document upload metrics.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[Next.js 14 Frontend App] -->|REST API & SSE| FastAPI[FastAPI Backend Server]
    FastAPI -->|ORM / SQL| DB[(Neon Cloud PostgreSQL)]
    FastAPI -->|SDK| Cloudinary[Cloudinary Cloud Storage]
    FastAPI -->|OAuth 2.0| Google[Google Identity Services]
    FastAPI -->|Async Worker| AI[AI Verification & OCR Engine]
```

---

## 💻 Tech Stack

### **Frontend Framework & Styling**
* **Framework**: Next.js 14 (App Router, React 18)
* **Language**: TypeScript
* **Styling**: Tailwind CSS + Vanilla CSS Tokens
* **Icons & Components**: Lucide React, Framer Motion
* **State Management**: React `AuthContext`, `ThemeContext`

### **Backend Framework & Services**
* **Framework**: FastAPI (Python 3.10+)
* **Server**: Uvicorn (ASGI Engine)
* **Database ORM**: SQLAlchemy 2.0
* **Authentication**: Passlib (`argon2-cffi`), PyJWT, Pydantic v2
* **Storage**: Cloudinary SDK
* **Document Processing**: Pillow (PIL), PyMuPDF (fitz)

### **Database & Infrastructure**
* **Database**: Neon Cloud Serverless PostgreSQL
* **Media Storage**: Cloudinary CDN
* **Environment**: macOS / Linux compatible

---

## 🎨 UI & UX Design System

| Element | Light Mode | Dark Mode |
|---|---|---|
| **Background** | `bg-slate-50` | `bg-slate-950` |
| **Card Containers** | `bg-white border-slate-200` | `bg-slate-900 border-slate-800` |
| **Input Fields** | `bg-slate-50 border-slate-200` | `bg-slate-900/80 border-slate-700/80` |
| **Primary Accents** | `bg-indigo-600` | `bg-indigo-500` |
| **Theme Toggle** | `bg-slate-100 text-indigo-600` | `bg-slate-900 text-amber-400` |

---

## 🔑 Environment Variables

Create a `.env` file in the root project directory:

```env
# -----------------------------------------------------------------------------
# DATABASE CONNECTION (Neon PostgreSQL)
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
# CLOUDINARY MEDIA STORAGE
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
# SMTP EMAIL DELIVERY (Optional)
# -----------------------------------------------------------------------------
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
* **Python**: `3.10` or higher
* **Node.js**: `18.0` or higher (`npm`)

### 2. Backend Installation
```bash
# Clone the repository
git clone https://github.com/hariharan1476/AI-Powered-Document-and-Image-Verification-Platform.git
cd AI-Powered-Document-and-Image-Verification-Platform

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt
```

### 3. Database Initialization & Seeding
```bash
python3 -m backend.scripts.reset_db
```

### 4. Run Development Servers

**Start Backend Server**:
```bash
python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```
* Interactive API Documentation: `http://localhost:8000/docs`

**Start Frontend Application** (in a second terminal):
```bash
cd frontend
npm install
npm run dev
```
* Web Application: `http://localhost:3000`

---

## 👤 Seeded System Accounts

After running database setup, the following accounts are pre-configured:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| 👑 **Super Admin** | `hariharankrishnamoorthy1476@gmail.com` | `Admin@2026!Hari` | Complete System Control & User Management |
| 👤 **Demo User** | `demo@example.com` | `DemoUser@123` | Document Verification & History Access |

---

## 📡 Complete API Endpoint Reference

### 1. System Health
* `GET /health` — Check system database connectivity and status.

### 2. Authentication & Session Security
* `POST /api/auth/login` — Authenticate user and issue Access + Refresh JWTs.
* `POST /api/auth/register` — Create user account and trigger verification OTP.
* `POST /api/auth/verify-email` — Validate 6-digit email OTP.
* `POST /api/auth/refresh` — Issue new access token via refresh token rotation.
* `GET /api/auth/me` — Get current logged-in user details.
* `GET /api/auth/sessions` — Fetch active sessions and device info.
* `DELETE /api/auth/sessions/{session_id}` — Terminate a specific session.
* `POST /api/auth/logout-all` — Revoke all device sessions.
* `GET /api/auth/google` — Get Google OAuth 2.0 login URL.

### 3. Document Upload & AI Verification
* `POST /api/upload/` — Upload document (`.pdf`, `.png`, `.jpg`) for verification.
* `GET /api/upload/stream/{job_id}` — Real-time SSE stream broadcasting verification progress.

### 4. Verification History
* `GET /api/verification/history` — Fetch authenticated user's verification records.

### 5. Admin Management
* `GET /api/admin/users` — List all registered users and system metrics.

---

## 🔄 Database Management & Seeding

To clear test uploads, reset sessions, and restore admin access:
```bash
python3 -m backend.scripts.reset_db
```

---

## 🔒 Security Architecture

1. **Password Security**: Argon2id via `passlib` with high memory-cost parameters.
2. **Session Security**: Single-use token rotation prohibiting token replay attacks.
3. **Database Protection**: Parameterized SQL queries via SQLAlchemy ORM preventing SQL injection.
4. **Tenant Isolation**: Strict user-level authorization checks on all document and history endpoints.

---

© 2026 VerifyAI Platform. All rights reserved.