# 🎥 Screen Recorder MVP (Marvedge Recorder)

A minimal yet complete screen recording MVP built with **Next.js 16 + TypeScript**, demonstrating browser video recording, trimming, persistence, cloud storage, sharing, and analytics.

This project intentionally focuses on **core product functionality** over authentication or user management, as required by the assignment.

---

## 🚀 Features Implemented

### 1. In-Browser Screen Recording
- Records **screen + microphone audio**
- Uses the **MediaRecorder API**
- Start / Stop controls
- Saves output as `.webm`

### 2. Persistent Local Storage (Browser)
- Recorded video is persisted using **IndexedDB**
- Refreshing the page does **not** lose the recording
- Avoids `sessionStorage` due to size and reliability limits

### 3. Video Trimming
- Dedicated **Trim Video** page
- Uses **ffmpeg.wasm** (client-side)
- Start & End time trimming
- Preview trimmed output
- Export trimmed video as `.webm`

### 4. Upload & Share (AWS S3)
- Final videos uploaded to **Amazon S3**
- Generates **pre-signed URLs** (secure, time-limited)
- Public shareable video page

### 5. Analytics (File-based Persistence)
- Tracks:
  - 👀 View count
  - ⏱ Watch completion percentage
- Analytics persisted in `analytics.json`
- No external database required

---

## 📁 Folder Structure (ASCII)

screen-recorder-mvp/
├── app/
│ ├── api/
│ │ ├── upload/
│ │ │ └── route.ts # Upload video to S3
│ │ ├── analytics/
│ │ │ └── route.ts # View + watch analytics
│ │ └── videos/
│ │ ├── route.ts # List videos with analytics
│ │ └── [id]/
│ │ └── route.ts # Generate signed URLs
│ │
│ ├── recording/
│ │ └── page.tsx # Recording UI
│ ├── trim/
│ │ └── page.tsx # Trimming UI
│ ├── videos/
│ │ └── [id]/page.tsx # Public video page
│ │
│ ├── layout.tsx
│ ├── page.tsx
│ └── globals.css
│
├── components/
│ ├── Recorder.tsx # Recording + Upload logic
│ ├── Navbar.tsx
│ └── ui/
│ └── button.tsx
│
├── lib/
│ ├── videoStore.ts # IndexedDB persistence
│ ├── s3.ts # AWS S3 client
│ ├── analyticsStore.ts # analytics.json logic
│ ├── videoMetadataStore.ts # videos.json metadata
│ └── utils.ts
│
├── public/
│
├── analytics.json # File-based analytics store
├── videos.json # Uploaded video metadata
│
├── .env.local
├── .env.example
├── package.json
├── tsconfig.json
└── README.md

yaml
Copy code

---

## 🧠 Architecture Decisions

### ❌ No Authentication (Intentional)
Authentication was **intentionally excluded** to keep the MVP focused on:
- Recording
- Trimming
- Uploading
- Sharing
- Analytics

#### Authentication should be added only when:
- Users own videos
- Videos are private
- Dashboards are required
- Billing / subscriptions are needed

---

### 🧠 Why IndexedDB (Not sessionStorage)?
- Video blobs can be **hundreds of MBs**
- `sessionStorage` is memory-bound and unreliable
- IndexedDB allows:
  - Large binary storage
  - Persistence across reloads
  - Non-blocking access

---

### ✂️ Why a Separate Trim Page?
- Keeps recording logic clean
- Separates concerns:
  - Recording ≠ Processing
- Easier to maintain & extend
- Improves UX clarity

---

### 🔁 Recording & Trimming Are Decoupled
Flow intentionally designed as:

Record → Download Raw Video → Trim → Download Trimmed → Upload & Share

yaml
Copy code

Benefits:
- User can verify output before uploading
- Prevents accidental uploads
- Clear product flow

---

## ☁️ AWS S3 Setup

### Environment Variables (`.env.local`)
```env
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=marvedge-recorder-mvp
NEXT_PUBLIC_APP_URL=http://localhost:3000
⚠️ .env.local is ignored by Git — credentials are never committed.

Upload Flow
Video sent to /api/upload

Stored in S3 under videos/{id}.webm

Pre-signed URL generated (7 days)

Metadata saved in videos.json

📊 Analytics Design
Tracked Metrics
Views → incremented on page load

Watch Completion %

Based on watched duration vs total duration

Stored per session

Storage
analytics.json

File-based persistence (no DB required)

Why File-Based?
Fits MVP scope

Simple, debuggable

Easily replaceable with DB later

▶️ How to Run Locally
bash
Copy code
npm install
npm run dev
Visit:

arduino
Copy code
http://localhost:3000
🧪 Tested Flow
✔ Record screen + mic
✔ Refresh page → recording persists
✔ Trim video
✔ Download raw & trimmed versions
✔ Upload to S3
✔ Generate shareable link
✔ View analytics update

🔮 Future Improvements (Production)
Authentication (NextAuth / Clerk)

Private videos

User dashboards

Database (Postgres / DynamoDB)

Video thumbnails

Background processing (Lambda)

Rate limiting & quotas

📄 Assignment Reference
This implementation satisfies all requirements outlined in the assignment PDF 
🚀 Full Stack Developer for AI-…

.

🏁 Final Notes
This MVP demonstrates:

Browser APIs mastery

Media handling

Cloud integration

Product thinking

Clean architecture

Built intentionally simple, focused, and extensible.
