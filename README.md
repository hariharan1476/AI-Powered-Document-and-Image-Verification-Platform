# AI-Powered Document & Image Verification Platform

An AI-assisted platform for verifying documents and images — resumes, certificates, and other supported documents — using OCR, NLP, LayoutLM, and a custom ML verification engine.

> **Important**: This platform is AI-assisted, not forensic. It provides verification scores, detected issues, evidence and recommendations. It does **not** claim to guarantee 100% authenticity of any document.

---

## Features

- Upload and verify PDF, JPG, JPEG, PNG documents
- OCR-based text extraction for both PDFs and images
- Document classification (Resume, Certificate, Unknown)
- Field extraction (name, email, skills, course, dates, etc.)
- AI/ML verification pipeline:
  - Completeness analysis
  - Consistency analysis
  - Authenticity analysis
  - Basic tamper/manipulation indicator detection
- LayoutLMv3 document AI analysis
- Verification scores (0–100) for each dimension
- Final status: VERIFIED / REVIEW REQUIRED / SUSPICIOUS / DOCUMENT DETECTED
- Sequential multi-document processing (no arbitrary limit)
- PDF verification report download (jsPDF)
- Results stored in PostgreSQL/Neon

---

## Architecture

```
Frontend (Next.js)
      |
      v
FastAPI Backend
      |
      +------ Upload Route (POST /api/upload/)
      |           |
      |           +-- File validation
      |           +-- Save temporary file (uploads/)
      |           +-- Create DB record
      |           +-- Run verification service
      |           +-- Save result to Neon
      |           +-- Return result
      |
      +------ Report Route (GET /api/report/{id})
      |
      v
Verification Service
      |
      +-- OCR / Text Extraction (PyMuPDF / PIL / pytesseract)
      +-- LayoutLMv3 Analysis (ml/layoutlm_analyzer.py)
      +-- Document Classification (ml/document_classifier.py)
      +-- Certificate: extract_certificate_fields + verify_certificate
      +-- Resume: ML Verification Engine (ml/verification_engine.py)
      +-- Score Normalization
      +-- Save to PostgreSQL
      |
      v
Neon PostgreSQL
  - documents table (metadata only)
  - verifications table (scores + JSON result)
```

---

## Technology Stack

| Layer      | Technology                                |
|------------|-------------------------------------------|
| Frontend   | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend    | Python, FastAPI, SQLAlchemy               |
| Database   | PostgreSQL (Neon)                         |
| ML / AI    | LayoutLMv3, custom ML verification engine |
| OCR        | PyMuPDF, pytesseract, PIL                |
| Cloud      | Cloudinary (document storage)             |
| Reports    | jsPDF + jspdf-autotable                   |

---

## Project Structure

```
Project-01/
├── backend/
│   ├── app.py                     # FastAPI application
│   ├── verify.py                  # Core OCR + extraction + verification
│   ├── cloudinary_config.py       # Cloudinary upload/delete
│   ├── routes/
│   │   ├── upload.py              # POST /api/upload/
│   │   ├── verification.py        # POST /api/verification/{id}
│   │   └── report.py              # GET /api/report/{id}
│   ├── services/
│   │   ├── verification_service.py # Full pipeline orchestration
│   │   └── file_service.py        # File save + Cloudinary upload
│   ├── models/
│   │   ├── document.py            # Document SQLAlchemy model
│   │   └── verification.py        # Verification SQLAlchemy model
│   ├── database/
│   │   └── db.py                  # DB connection + session
│   └── utils/
│       ├── file_validator.py
│       └── helpers.py
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Main UI (upload + results + reports)
│   │   ├── globals.css
│   │   └── layout.tsx
│   └── package.json
├── ml/
│   ├── verification_engine.py     # Main ML verification engine (CLI)
│   ├── layoutlm_analyzer.py       # LayoutLMv3 integration
│   ├── document_classifier.py     # Document type classifier
│   ├── nlp_extractor.py           # NLP field extraction
│   └── verification.py            # Verification logic
├── uploads/                       # Temporary file storage (gitignored)
├── .env                           # Secrets (gitignored — never commit)
├── .env.example                   # Template for .env
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Installation

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Cloudinary account
- `tesseract-ocr` installed on system (for image OCR)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/hariharan1476/AI-Powered-Document-and-Image-Verification-Platform.git
cd AI-Powered-Document-and-Image-Verification-Platform

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your real values
nano .env
```

Required variables:

| Variable                  | Description                           |
|---------------------------|---------------------------------------|
| `DATABASE_URL`            | Neon PostgreSQL connection string     |
| `CLOUDINARY_CLOUD_NAME`   | Your Cloudinary cloud name            |
| `CLOUDINARY_API_KEY`      | Your Cloudinary API key               |
| `CLOUDINARY_API_SECRET`   | Your Cloudinary API secret            |

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Running Locally

### Start Backend

```bash
# From project root, with venv active
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Verify:
- `GET http://127.0.0.1:8000/` → `{"message": "AI Document Verification API", "status": "running"}`
- `GET http://127.0.0.1:8000/health` → `{"status": "healthy"}`

### Start Frontend

```bash
cd frontend
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

---

## API Endpoints

| Method | Endpoint                        | Description                                      |
|--------|---------------------------------|--------------------------------------------------|
| GET    | `/`                             | API status                                       |
| GET    | `/health`                       | Health check                                     |
| POST   | `/api/upload/`                  | Upload + verify document (returns full result)   |
| POST   | `/api/verification/{id}`        | Re-verify an already-uploaded document           |
| GET    | `/api/report/{document_id}`     | Retrieve stored verification result from DB      |

### Upload Request

```
POST /api/upload/
Content-Type: multipart/form-data

Field name: file
```

### Upload Response Structure

```json
{
  "message": "File uploaded and verification completed",
  "document": {
    "id": 1,
    "filename": "resume.pdf",
    "file_type": ".pdf",
    "file_size": 123456,
    "file_hash": "sha256...",
    "status": "verified"
  },
  "verification": {
    "authenticity_score": 95.0,
    "completeness_score": 91.67,
    "consistency_score": 100.0,
    "overall_score": 97.92
  },
  "result": {
    "document_type": "RESUME",
    "classification_confidence": 95.0,
    "fields": { ... },
    "sections_detected": { ... },
    "layoutlm": { ... },
    "verification": {
      "completeness": 91.67,
      "consistency": 100.0,
      "authenticity": 95.0,
      "tamper_score": 0.0,
      "overall_score": 97.92,
      "status": "VERIFIED",
      "details": [ ... ],
      "completeness_analysis": { ... },
      "consistency_analysis": { ... },
      "authenticity_analysis": { ... },
      "tamper_analysis": { ... }
    }
  }
}
```

---

## Supported File Formats

| Format  | Extension         | Notes                          |
|---------|-------------------|--------------------------------|
| PDF     | `.pdf`            | Text extraction via PyMuPDF    |
| JPEG    | `.jpg`, `.jpeg`   | OCR via pytesseract            |
| PNG     | `.png`            | OCR via pytesseract            |

Maximum file size: 25 MB per file.

---

## Verification Workflow

1. User selects one or more documents on the frontend
2. User clicks **Verify Documents**
3. Documents are processed **sequentially** (one at a time)
4. For each document:
   - File validated and saved temporarily to `uploads/`
   - Uploaded to Cloudinary for cloud storage
   - OCR / text extraction performed
   - LayoutLMv3 analysis run
   - Document classified (Resume / Certificate / Unknown)
   - Fields extracted specific to document type
   - ML verification engine run (completeness, consistency, authenticity, tamper)
   - Scores normalized (0–100)
   - Result saved to Neon PostgreSQL
   - Temporary local file deleted after processing
5. Frontend displays result card per document
6. User can download a PDF verification report per document

---

## Database

The platform stores **metadata and results only** — no document binaries are stored in PostgreSQL.

**`documents` table**: filename, file type, file size, file hash, Cloudinary URL, status, timestamp

**`verifications` table**: document_id, authenticity_score, completeness_score, consistency_score, overall_score, result (JSON text), details (JSON text), status, verified_at

---

## Privacy & Storage

- Uploaded documents are **temporarily processed** for verification.
- Original files are **not permanently stored** in the database.
- Temporary files in `uploads/` are cleaned up after processing.
- Verification results and metadata are retained in Neon for application purposes.
- This platform does **not** claim legal compliance (GDPR, DPDP, etc.). It is an educational/MVP implementation.

---

## Limitations

- **Not forensic**: Verification scores are AI-assisted estimates, not legal or forensic proof.
- **Tamper detection**: Basic indicator detection only. A low tamper score does not guarantee authenticity.
- **OCR quality**: Heavily stylised certificates or low-resolution images may produce incomplete text extraction.
- **LayoutLM**: Optional analysis — failure does not stop verification.
- **No user authentication**: MVP only. No login, sessions, or per-user isolation.
- **No production hardening**: Not production-ready without proper security review.

---

## Future Improvements

- User authentication and per-user document history
- Object storage (S3/GCS) for processed document archive
- Async processing queue (Celery + Redis) for large batches
- Advanced forensic analysis integrations
- Email notification on completion
- Admin dashboard and analytics
- Mobile-optimised UI

---

## License

This project is an educational MVP. No license is provided for production or commercial use without review.
