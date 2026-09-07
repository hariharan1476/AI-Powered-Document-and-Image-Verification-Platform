# 🛡️ AI-Powered Document & Image Verification Platform

A modern, production-ready, SaaS-grade application for document verification, fraud detection, and multi-device user authentication. Built with **FastAPI**, **Next.js 14**, **Neon PostgreSQL**, **Cloudinary**, **Argon2id Hashing**, **Dual JWT Authentication**, and **Server-Sent Events (SSE)**.

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [💻 Tech Stack](#-tech-stack)
- [⚙️ Environment Variables Configuration](#️-environment-variables-configuration)
- [🚀 Quickstart & Setup Guide](#-quickstart--setup-guide)
- [🔑 Seeded System Accounts](#-seeded-system-accounts)
- [📡 Complete API Endpoint Reference](#-complete-api-endpoint-reference)
  - [1. System Health](#1-system-health)
  - [2. Authentication & Session Security](#2-authentication--session-security)
  - [3. Document Upload & AI Verification](#3-document-upload--ai-verification)
  - [4. Verification History](#4-verification-history)
  - [5. Admin Management](#5-admin-management)
- [🧹 Database Reset & Seeding](#-database-reset--seeding)
- [🛡️ Security Architecture](#️-security-architecture)

---

## ✨ Key Features

- 🔐 **SaaS Authentication Suite**:
  - **Argon2id Password Hashing**: Resistant to GPU/ASIC brute-force attacks.
  - **Dual JWT Token System**: Short-lived 15-minute Access Tokens + 7-day Refresh Tokens with automatic token rotation.
  - **Multi-Device Session Tracking**: View active browser sessions, IP addresses, device names, and perform single-click **"Logout All Devices"**.
  - **Google OAuth 2.0 Integration**: Single Sign-On (SSO) with automated account linking and safe `NULL` password handling.
  - **OTP & Password Reset**: 6-digit email verification OTPs and single-use magic links.
  
- 📄 **AI Document Verification Pipeline**:
  - **Multi-Format Support**: `.pdf`, `.png`, `.jpg`, `.jpeg`.
  - **Cloud Storage Integration**: Direct upload and hosting via **Cloudinary API**.
  - **Real-Time Progress Streaming**: Live SSE stream (`/api/upload/stream/{job_id}`) providing feedback as documents undergo OCR, authenticity scoring, and completeness checks.
  - **Verification Metrics**: Returns detailed breakdown scores for **Authenticity**, **Completeness**, and **Consistency**.

- 🔒 **Data Scoping & Security**:
  - **Strict User Scoping**: `/api/verification/history` ensures users can only access their own uploaded documents.
  - **Clean Error Formatting**: Zero raw `[object Object]` crashes; human-friendly error messages formatted for UI rendering.

- 👑 **Admin Portal**:
  - Full management dashboard to inspect user accounts, roles, statuses (`ACTIVE`, `SUSPENDED`), and system usage metrics.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[Next.js 14 Frontend App] -->|REST & SSE| FastAPI[FastAPI Backend Server]
    FastAPI -->|ORM / SQL| DB[(Neon Cloud PostgreSQL)]
    FastAPI -->|SDK| Cloudinary[Cloudinary Cloud Storage]
    FastAPI -->|OAuth 2.0| Google[Google Identity Services]
    FastAPI -->|Background Worker| AI[AI Verification & Analytics Engine]
```

---

## 💻 Tech Stack

### **Frontend**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS Design Tokens + Tailwind CSS
- **State & Auth**: React `AuthContext`, LocalStorage token rotation

### **Backend**
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn (ASGI)
- **Database ORM**: SQLAlchemy
- **Security**: Passlib (`argon2-cffi`), PyJWT, Pydantic v2
- **Storage**: Cloudinary Python SDK
- **Image Processing**: Pillow (PIL), PyMuPDF (fitz)

### **Database & Infrastructure**
- **Database**: Cloud-Hosted Neon PostgreSQL
- **Media CDN**: Cloudinary
- **Environment**: macOS / Linux compatible

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the root project directory with the following variables:

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
# SMTP EMAIL DELIVERY (Optional for Production Email Sending)
# -----------------------------------------------------------------------------
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python**: `3.10` or higher
- **Node.js**: `18.0` or higher (`npm`)

### 2. Backend Setup
1. Clone the repository and navigate to project root:
   ```bash
   git clone <repository_url>
   cd Project-01
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install required Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```

### 3. Database Seeding
Initialize and seed the database with clean tables and default accounts:
```bash
python3 -m backend.scripts.reset_db
```

### 4. Running the Servers
1. **Start Backend Server**:
   ```bash
   python3 -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
   ```
   - API Docs available at: `http://localhost:8000/docs`

2. **Start Frontend Server** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Frontend Application available at: `http://localhost:3000`

---

## 🔑 Seeded System Accounts

After running `python3 -m backend.scripts.reset_db`, the following accounts are ready:

| Role | Email | Password | Access Level |
|---|---|---|---|
| 👑 **Super Admin** | `hariharankrishnamoorthy1476@gmail.com` | `Admin@2026!Hari` | Full System & User Management Access |
| 👤 **Demo User** | `demo@example.com` | `DemoUser@123` | Standard Verification & History Access |

---

## 📡 Complete API Endpoint Reference

### 1. System Health

#### `GET /health`
- **Description**: Returns database connection and service health status.
- **Auth Required**: None
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "database": "connected"
  }
  ```

---

### 2. Authentication & Session Security

#### `POST /api/auth/login`
- **Description**: Authenticate user and issue JWT Access + Refresh tokens.
- **Request Body**:
  ```json
  {
    "email": "hariharankrishnamoorthy1476@gmail.com",
    "password": "Admin@2026!Hari"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "name": "Hariharan Krishnamoorthy (Admin)",
      "email": "hariharankrishnamoorthy1476@gmail.com",
      "is_admin": true
    }
  }
  ```

#### `POST /api/auth/refresh`
- **Description**: Rotates access token using a valid refresh token.
- **Request Body**:
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```

#### `GET /api/auth/me`
- **Description**: Retrieves active user profile details.
- **Headers**: `Authorization: Bearer <access_token>`

#### `GET /api/auth/sessions`
- **Description**: Lists all active logged-in devices/sessions for the authenticated user.
- **Headers**: `Authorization: Bearer <access_token>`

#### `POST /api/auth/logout`
- **Description**: Invalidates current device session token.

#### `POST /api/auth/logout-all`
- **Description**: Revokes all active sessions across all devices for the current user.

#### `GET /api/auth/google`
- **Description**: Generates Google OAuth 2.0 authorization consent URL.

#### `GET /api/auth/google/callback?code=...`
- **Description**: Handles OAuth code exchange, auto-creates user if missing, issues session tokens, and redirects to frontend.

---

### 3. Document Upload & AI Verification

#### `POST /api/upload/`
- **Description**: Upload a document file for verification.
- **Headers**: `Authorization: Bearer <access_token>`
- **Content-Type**: `multipart/form-data`
- **Form Data**: `file` (Binary file: `.pdf`, `.png`, `.jpg`, `.jpeg`)
- **Response `200 OK`**:
  ```json
  {
    "message": "Verification started",
    "job_id": "1e12f057-6026-4f72-a443-f719b844db74"
  }
  ```

#### `GET /api/upload/stream/{job_id}`
- **Description**: Real-time Server-Sent Events (SSE) stream for verification progress updates.
- **Response Event Stream**:
  ```text
  data: {"status": "uploading", "progress": 5, "log": "Saving file to Cloudinary"}
  data: {"status": "verifying", "progress": 50, "log": "Running OCR authenticity score"}
  data: {"status": "completed", "progress": 100, "result": {...}}
  ```

---

### 4. Verification History

#### `GET /api/verification/history`
- **Description**: Retrieve user-isolated scan history.
- **Headers**: `Authorization: Bearer <access_token>`
- **Response `200 OK`**:
  ```json
  {
    "count": 1,
    "items": [
      {
        "id": 8,
        "filename": "e2e_invoice.png",
        "cloudinary_url": "https://res.cloudinary.com/...",
        "created_at": "2026-09-07T13:12:19",
        "verification": {
          "authenticity_score": 95.0,
          "completeness_score": 90.0,
          "overall_score": 92.5
        }
      }
    ]
  }
  ```

---

### 5. Admin Management

#### `GET /api/admin/users`
- **Description**: Admin-only endpoint to list all user accounts and system metrics.
- **Headers**: `Authorization: Bearer <access_token>` (Admin account required)

---

## 🧹 Database Reset & Seeding

To clean up all test documents, reset user sessions, and restore standard admin credentials:

```bash
python3 -m backend.scripts.reset_db
```

This script:
1. Clears `verifications`, `documents`, `verification_tokens`, `sessions`, `oauth_accounts`, and `users`.
2. Seeds `hariharankrishnamoorthy1476@gmail.com` as Admin.
3. Seeds `demo@example.com` as regular User.

---

## 🛡️ Security Architecture

1. **Password Security**: Argon2id (`passlib[argon2]`) with strict salt parameters.
2. **Session Security**: Single-use token rotation preventing replay attacks.
3. **Database Security**: Prepared statements & SQLAlchemy ORM preventing SQL injection.
4. **Data Privacy**: Endpoint level filters ensuring strict multi-tenant user isolation.
