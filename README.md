# EduSphere - Secure, Scalable, and Interoperable E-Learning Platform

EduSphere is an enterprise-grade digital learning platform for educational institutions and independent learners built with **React + TypeScript (Vite)**, **Node.js + Express (TypeScript)**, and **MongoDB** NoSQL architecture.

---

## 🌟 Architecture & Key Features

- **Multi-Tenant Logical Isolation:** Powered by Node.js `AsyncLocalStorage` request-context propagation and Mongoose tenant filtering. Supports universities, schools, training centers, and independent public courses.
- **Role-Based & Attribute Access Control (RBAC/ABAC):** Granular authorization supporting Platform Administrators, Institution Administrators, Instructors, Students, and Independent Learners.
- **Integrated Live Virtual Classrooms:** Real-time WebRTC media simulation, host screen sharing, live participant roster, synchronized in-class discussion, and automated attendance telemetry.
- **Proctored Assessments & Auto-Grading:** Timed examination player with browser blur/tab-switch detection, randomized question pools, deterministic auto-scoring, and auto-submit on timeout.
- **Cryptographic Certificate Verification:** Digital diplomas sealed with SHA-256 verification hashes, dynamic QR codes, and a public verification lookup portal (`/verify/:certificateNumber`).
- **Extended Enterprise Subsystems:**
  - Anti-cheating & proctoring telemetry
  - Adaptive HLS video streaming pipeline specifications
  - Stripe Connect multi-party payout architecture
  - LTI 1.3 & SCORM 1.2/2004 interoperability bridges

---

## 🚀 Running the Platform

Both servers run concurrently:

```bash
# In one terminal: Start Backend API (Port 5000)
cd server
npm run dev

# In another terminal: Start Frontend Vite Client (Port 5173)
cd client
npm run dev
```

Visit the application at: **`http://localhost:5173`**

---

## 🔐 Production User Management & Bootstrap

EduSphere strictly adheres to enterprise zero-trust security standards: **no default or hardcoded demo credentials exist in production**.

### 1. Bootstrapping the First Root Platform Administrator
Before launching the application for the first time, provision the initial Platform SuperAdmin account using the secure bootstrap CLI tool:

```bash
cd server
npm run bootstrap:admin
```
*The command will interactively prompt for the administrator email, full name, and password with masked input (`*`). Alternatively, supply `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, and `INITIAL_ADMIN_NAME` in your environment.*

**Security Policy:**
* Passwords must be at least 12 characters and contain uppercase, lowercase, numbers, and symbols.
* Passwords are encrypted with `bcrypt` (12 salt rounds).
* The bootstrap routine executes only once. Once a Platform SuperAdmin exists, subsequent invocations are rejected.

### 2. User Registration & Roles
* **Students & Learners:** Self-register via the public `/register` portal with dynamic email verification.
* **Instructors:** Self-register or receive invitations from verified educational institutions.
* **Institutions (Universities, Schools, Academies):** Apply via the Institution Onboarding portal (`/institution-register`). Platform SuperAdmins inspect the accreditation dossier and approve tenant access via the Admin Console.

---

## 📱 Screen Inventory & Mockup Mapping

| Mockup # | Screen Description | Component File |
| :--- | :--- | :--- |
| **Mockup 1** | Landing / Home Page (Hero, Audience Segments, Popular Courses, Proof Stats) | [`client/src/pages/LandingPage.tsx`](client/src/pages/LandingPage.tsx) |
| **Mockup 2** | Split-Screen Login & Registration Portal (Dynamic Authentication & Self-Service) | [`client/src/pages/AuthPage.tsx`](client/src/pages/AuthPage.tsx) |
| **Mockup 3** | Learner Dashboard (4 KPI widgets, Continue Learning, Recommendations) | [`client/src/pages/LearnerDashboard.tsx`](client/src/pages/LearnerDashboard.tsx) |
| **Mockup 4** | Course Detail Page (Dark hero, curriculum accordion, sticky enrollment card) | [`client/src/pages/CourseDetailPage.tsx`](client/src/pages/CourseDetailPage.tsx) |
| **Mockup 5** | My Courses View (Segmented tabs: Enrolled, Completed, In-Progress) | [`client/src/pages/MyCoursesPage.tsx`](client/src/pages/MyCoursesPage.tsx) |
| **Mockup 6** | Teacher Course Builder (4-stage stepper wizard: Info -> Content -> Settings -> Publish) | [`client/src/pages/TeacherCourseStudio.tsx`](client/src/pages/TeacherCourseStudio.tsx) |
| **Mockup 7** | Institution Registration (Accreditation dossier upload & verification application) | [`client/src/pages/InstitutionRegisterPage.tsx`](client/src/pages/InstitutionRegisterPage.tsx) |
| **Mockup 8** | Platform & Institution Admin Dashboard (KPI metrics, Recent Institutions approval queue) | [`client/src/pages/AdminDashboard.tsx`](client/src/pages/AdminDashboard.tsx) |
| **Mockup 9** | Integrated Live WebRTC Classroom (Video grid, screen share canvas, chat, attendance) | [`client/src/pages/LiveClassroomPage.tsx`](client/src/pages/LiveClassroomPage.tsx) |
| **Mockup 10** | Proctored Exam Player (30:00 countdown timer, anti-cheating tab blur detection) | [`client/src/pages/AssessmentExamPlayer.tsx`](client/src/pages/AssessmentExamPlayer.tsx) |
| **Mockup 11** | Public Certificate Verification Portal (QR code validator, SHA-256 seal, PDF print) | [`client/src/pages/CertificateVerifyPage.tsx`](client/src/pages/CertificateVerifyPage.tsx) |
