# Campusly 🎓

<div align="center">

![Campusly Banner](https://img.shields.io/badge/Campusly-Digital%20Campus%20Companion-2563eb?style=for-the-badge&logo=school&logoColor=white)

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Campusly** is an all-in-one digital campus companion and modern college management platform. Designed for students, faculty, and administrators, Campusly simplifies daily campus life with schedule tracking, intelligent attendance analytics, AI-powered academic assistance, resource sharing, and streamlined campus governance.

[Key Features](#-key-features) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Environment Variables](#-environment-variables) • [Deployment](#-deployment) • [API Reference](#-api-reference)

</div>

---

## 🚀 Key Features

### 👨‍🎓 Student Portal
- **📅 Dynamic Timetable & Live Class Tracker**: View daily schedules based on Day Order, current ongoing class, upcoming lectures, and cancellation alerts.
- **📊 Smart Attendance Analytics**: Subject-wise percentage tracking, visual status indicators, threshold alerts (75% criterion), and "safe bunk / classes needed" calculations.
- **🤖 AI Campus Assistant**: 24/7 intelligent chatbot powered by OpenRouter LLMs, context-aware of student department, semester, and timetable.
- **📝 Tasks & Assignment Planner**: Manage tasks with priority levels, due dates, subject tagging, and completion status.
- **📚 Curated Study Materials & Notes**: Browse and download semester-wise lecture notes, summaries, and revision guides.
- **🎥 Video Lecture Hub**: Access recorded classes and join scheduled live lecture sessions.
- **🏛️ Campus Directory & Navigation**: Search faculty cabins, HOD contacts, departmental laboratories, facilities, and emergency helplines.
- **🎫 Digital Gate Pass & Leave Applications**: Submit leave requests and digital gate pass applications directly to wardens/mentors with real-time status updates.
- **🍽️ Mess & Hostel Services**: View daily mess menus, timings, hostel warden contacts, and rules.
- **📢 Announcements & Notices**: Pinned college alerts, departmental updates, and examination schedules.
- **⏱️ Focus & Productivity**: Integrated Pomodoro study timer with ambient study themes.
- **🌐 Multilingual Campus Translator**: Real-time language translation for seamless campus communication.
- **📈 CGPA & Grade Calculator**: Semester-by-semester SGPA/CGPA estimator.

### 🛡️ Admin & Faculty Portal
- **📊 Central Analytics Dashboard**: Quick insight into active student count, ongoing notices, and open grievances.
- **📢 Notice Management**: Draft, publish, and pin urgent campus-wide announcements.
- **📁 Academic Resources Management**: Upload and organize study notes and video lectures by department and semester.
- **🛠️ Grievance Redressal (Complaint Box)**: Manage student issues with lifecycle status (`Pending` ➔ `In Progress` ➔ `Resolved`).

---

## 🏗️ Architecture

```
Campusly (Monorepo)
├── studyapp/               # Universal Frontend (Web, Android, iOS)
│   ├── app/                # Root navigation & screens
│   ├── src/                # Modular UI components, screens, hooks & contexts
│   │   ├── app/            # Expo Router file-based routes
│   │   │   ├── (tab)/      # Tab navigation (Home, Tasks, Schedule, Profile, AI)
│   │   │   └── admin/      # Administrator portal screens
│   │   ├── components/     # Reusable UI widgets & themes
│   │   ├── firebase/       # Firebase Client SDK integration
│   │   └── services/       # Frontend API clients & utilities
│   ├── assets/             # Icons, splash screens, branding
│   ├── app.json            # Expo configuration
│   ├── eas.json            # Expo Application Services build configuration
│   └── vercel.json         # Vercel static web deployment config
│
├── backend/                # Node.js & Express REST API
│   ├── api/                # Vercel serverless API handler
│   ├── config/             # DB (MongoDB), Firebase Admin & AI configurations
│   ├── controllers/        # Request controllers
│   ├── middleware/         # Auth (JWT), Admin guards, Rate limiting
│   ├── models/             # Mongoose schemas (User, Timetable, Notice, Exam, etc.)
│   ├── routes/             # Express API route modules
│   ├── services/           # Business logic services
│   ├── server.js           # Express app instance & server startup
│   └── vercel.json         # Backend Vercel serverless configuration
│
├── api/                    # Root Vercel serverless entry point
├── firestore.rules         # Security rules for Firebase Firestore
└── package.json            # Monorepo scripts & root dependencies
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Mobile & Web** | React Native 0.86, Expo SDK 57, Expo Router, React 19, TypeScript, Reanimated, Safe Area Context |
| **Backend API** | Node.js (18+), Express 5, Mongoose 9, JWT, bcryptjs, express-rate-limit |
| **Database** | MongoDB / MongoDB Atlas, Firebase Firestore |
| **Authentication** | Custom JWT Token Auth & Firebase Authentication |
| **AI Integration** | OpenRouter API (Nemotron, GPT-4o-mini, openrouter/free) |
| **Cloud & Deployment** | Vercel (Web & Serverless Backend), Expo Application Services (EAS for APK/AAB) |

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (Local installation or free MongoDB Atlas URI)
- [Expo Go app](https://expo.dev/go) (optional, for physical mobile testing)

### 1. Clone the Repository
```bash
git clone git@github.com:nganeshdora74/campusly.git
cd campusly
```

### 2. Install Dependencies
Install root, frontend, and backend dependencies:
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies
cd studyapp && npm install && cd ..
```

---

## 🔐 Environment Variables

### Backend Configuration (`backend/.env`)
Create a `.env` file inside `backend/` (or copy from `backend/.env.example`):

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `JWT_SECRET` | Secret token used for signing JWTs | `your_jwt_secret` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features | `sk-or-v1-...` |
| `OPENROUTER_BASE_URL`| OpenRouter base API endpoint | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL`   | Model identifier | `openai/gpt-4o-mini` |
| `FIREBASE_PROJECT_ID`| Firebase project ID | `campusly-a2002` |
| `FIREBASE_CLIENT_EMAIL`| Service account email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY`| Service account private RSA key | `-----BEGIN PRIVATE KEY...` |

### Frontend Configuration (`studyapp/.env`)
Create a `.env` file inside `studyapp/` (or copy from `studyapp/.env.example`):

```bash
cp studyapp/.env.example studyapp/.env
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Base URL of Campusly Express backend | `http://localhost:5000` |
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | (Optional) Client-side OpenRouter API key | `sk-or-v1-...` |
| `EXPO_PUBLIC_OPENROUTER_BASE_URL`| OpenRouter base URL | `https://openrouter.ai/api/v1` |
| `EXPO_PUBLIC_OPENROUTER_MODEL` | Default model for student chat | `openrouter/free` |

> [!NOTE]
> For testing on a physical phone via Expo Go, replace `localhost` in `EXPO_PUBLIC_API_URL` with your computer's local IP address (e.g. `http://192.168.1.50:5000`).

---

## 🏃 Running Locally

You can run both services easily from the root repository:

### Run Everything Concurrently
```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Frontend (Expo Dev Server)
npm run dev:frontend
```

### Alternatively, run from individual folders:
```bash
# Backend
cd backend
npm run dev

# Frontend
cd studyapp
npm start          # Opens Expo CLI DevTools
npm run web        # Runs in Web browser directly
npm run android    # Runs on connected Android device/emulator
npm run ios        # Runs on iOS simulator (macOS required)
```

---

## 🚀 Deployment

### 1. Frontend Web Deployment (Vercel)
The `studyapp` frontend includes a preconfigured [vercel.json](file:///C:/Users/nnira/Desktop/Campusly/studyapp/vercel.json) that exports the Expo application as a static single-page web app.

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
2. Select your `campusly` repository.
3. Configure the project:
   - **Root Directory**: `studyapp`
   - **Framework Preset**: `Other`
   - **Build Command**: `npx expo export -p web` (or `npm run build`)
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `EXPO_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://your-backend.vercel.app`)
5. Click **Deploy**.

### 2. Backend API Deployment (Vercel)
The backend is set up for Vercel Serverless deployment using the root [vercel.json](file:///C:/Users/nnira/Desktop/Campusly/vercel.json) and [api/index.js](file:///C:/Users/nnira/Desktop/Campusly/api/index.js).

1. Import the same repository as a new Vercel project.
2. Leave **Root Directory** as `./` (root).
3. Add the Backend Environment Variables (`MONGODB_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, Firebase keys).
4. Click **Deploy**.

### 3. Mobile App Build (EAS)
Campusly is pre-configured with [eas.json](file:///C:/Users/nnira/Desktop/Campusly/studyapp/eas.json). To generate an Android APK:
```bash
cd studyapp
npx eas-cli login
npx eas-cli build -p android --profile preview
```

---

## 📡 API Reference

### Authentication
- `POST /api/auth/register` — Register a student or faculty account
- `POST /api/auth/login` — Login and receive JWT bearer token

### Timetable & Academics
- `GET /api/timetable/my` — Fetch student timetable for current semester/section
- `GET /api/timetable/next` — Fetch current or upcoming lecture
- `GET /api/exams/my` — List upcoming examinations & seating

### Campus Directory
- `GET /api/faculty` — List active faculty members with cabin & office hours
- `GET /api/directory` — List campus blocks, rooms, and facilities
- `GET /api/directory/search?q=query` — Search locations and facilities

### AI Assistant
- `POST /api/chat` — Context-aware AI queries for timetable, navigation, and campus queries

### Resources & Student Services
- `GET /api/notices` — Pinned and recent college notices
- `GET /api/notes` — Course notes and revision material
- `GET /api/videos` — Video lecture catalog
- `POST /api/complaints` — Submit grievance / maintenance complaint
- `GET /api/complaints/my` — Track status of filed complaints

### Admin Management
- `POST /api/admin/notices` — Broadcast new notice
- `POST /api/admin/videos` — Add lecture video
- `POST /api/admin/notes` — Publish lecture notes
- `GET /api/admin/dashboard` — Overview statistics
- `PUT /api/admin/complaints/:id` — Update grievance status

---

## 🔒 Security & Git Hygiene

- Sensitive credentials, API keys, and environment files (`.env`, `*.key`, `*.pem`) are strictly excluded via [.gitignore](file:///C:/Users/nnira/Desktop/Campusly/.gitignore).
- Do not commit production database credentials or private keys. Always use `.env.example` templates for configuration guidelines.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
