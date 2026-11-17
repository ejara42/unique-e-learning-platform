# EduSphere UI/UX Enterprise Audit

**Date:** 2026-11-18
**Scope:** Client application architecture, design system, component usability, accessibility (WCAG 2.1 AA), responsive layouts, and internationalization (English, Afaan Oromoo, Amharic).

---

## 1. Executive Summary

The EduSphere client (`client/src/`) is built on React 18, Vite, Tailwind CSS, and React Query. Over recent iterations, it has replaced generic prototype placeholders with structured UI components (`Button`, `Badge`, `Toast`, `Modal`, `EmptyState`, `Skeleton`, `DataState`, `StatCard`). 

However, critical UI/UX gaps remain before it satisfies international educational software standards (on par with Coursera, Canvas LMS, and Google Classroom) and meets the connectivity realities of Ethiopian schools, universities, and rural students:
1. **Inconsistent Call-Site Translations:** While `client/src/i18n/index.ts` contains rich dictionaries for English, Afaan Oromoo, and Amharic, several core pages (`TeacherCourseStudio.tsx`, `AssessmentExamPlayer.tsx`, `LiveClassroomPage.tsx`) contain hardcoded English strings instead of using the `useApp().t` dictionary hook.
2. **Missing Assignment Submission & Review Interface:** Learners have no dedicated UI to upload files or formatted text for homework/projects, and instructors have no rubric-driven grading interface.
3. **Progress Feedback Accuracy:** Course progress percentages on the learner dashboard and course detail are driven by arbitrary 20% steps rather than verified discrete lesson completions.
4. **Keyboard Accessibility & Focus Rings:** Several interactive cards and tab triggers lack prominent `focus-visible` outline rings for keyboard-only navigation.
5. **Low-Bandwidth Indicator & Mode:** The application lacks a lightweight "Data Saver / Offline Reading" toggle to allow students in low-connectivity areas to view cached text and syllabus structures without attempting video player renders.

---

## 2. Design System & Theming Audit

### Typography Hierarchy
- **Primary Font:** Inter / Plus Jakarta Sans for clean geometric body legibility.
- **Header Font:** High-contrast sans-serif with subtle letter-spacing (`-0.025em`) on display headings.
- **Credential / Code Font:** `JetBrains Mono` / monospace for SHA-256 verification stamps and certificate identifiers.
- **Ge'ez / Ethiopic Typography:** System font fallbacks (`'Nyala', 'Abyssinica SIL', 'Noto Sans Ethiopic'`) need explicit declaration in `tailwind.config.js` and `index.css` to guarantee clean rendering across Linux/Windows/Android platforms.

### Color Tokens & Contrast Ratio
- **Surface Navy:** `#0F172A` (Navy 950), `#1E293B` (Navy 900) provides high-contrast enterprise grounding.
- **Primary Blue:** `#2563EB` / `#1D4ED8` ensures > 4.5:1 contrast against light slate backgrounds.
- **Status Colors:** Success (`#16A34A`), Warning (`#D97706`), Destructive (`#DC2626`), Info (`#2563EB`) comply with WCAG 2.1 AA for graphical controls and text.
- **Dark Mode Support:** CSS variables in `index.css` define semantic tokens (`--bg-main`, `--surface-card`, `--border-color`, `--text-primary`), but complete auto-switching based on OS `prefers-color-scheme` requires verification across all nested components.

---

## 3. Page-by-Page Usability & Component Audit

| Page / Component | Key Strengths | Identified Usability Defects | Remediation Plan |
|---|---|---|---|
| **LandingPage** (`LandingPage.tsx`) | High-impact hero, accredited institution filters, live course discovery | Static statistical counter numbers should reflect live platform aggregates | Wire counters to public metrics endpoint with graceful fallback |
| **AuthPage** (`AuthPage.tsx`) | Clean dual tabs, password show/hide toggle, strict Zod feedback, zero demo persona shortcuts | Role selection labels in Amharic/Oromo require responsive spacing on mobile | Ensure flex-wrap and accessible radio/tab touch targets (min 44x44px) |
| **LearnerDashboard** (`LearnerDashboard.tsx`) | Clear greetings, metric summary cards, active course enrollments with progress bars | Progress percentages jump in 20% increments; no assignment deadline alert widget | Connect progress to discrete lesson completion records; add upcoming due dates |
| **TeacherCourseStudio** (`TeacherCourseStudio.tsx`) | Comprehensive syllabus outline tree, lesson builder, quiz authoring | Form controls are predominantly English; lacks rubric builder for assignments | Wrap all labels in i18n dictionary; add assignment & manual grading module |
| **AdminDashboard** (`AdminDashboard.tsx`) | Institution approval actions, student admissions queue, tenant switcher | Large data tables lack client-side pagination or search filter when tenant count grows | Add instant search input and paginated table navigation |
| **CourseDetailPage** (`CourseDetailPage.tsx`) | Clear syllabus outline, instructor bio, accreditation seal, enrollment button | No explicit indicator if a student cannot enroll due to institution exclusivity | Display clear badge explaining tenant affiliation requirements |
| **AssessmentExamPlayer** (`AssessmentExamPlayer.tsx`) | Clean question stepper, countdown timer, immediate grading summary | Short answer & essay questions lack indication that they require manual instructor review | Add clear notice: "Requires instructor evaluation" with pending status |
| **LiveClassroomPage** (`LiveClassroomPage.tsx`) | Audio-reactive stage rings, gallery/spotlight toggle, network pill, floating reactions | WebRTC stream relies on local MediaStream fallback; needs seamless reconnect alert | Add connection drop retry overlay and reconnect banner |
| **CertificateVerifyPage** (`CertificateVerifyPage.tsx`) | Official A4 diploma layout, QR code rendering, SHA-256 stamp, print isolation | External QR image API has network dependency | Implement local SVG/Canvas QR generation fallback |

---

## 4. Accessibility (WCAG 2.1 AA) Compliance

- **Non-Text Contrast:** Form inputs, active buttons, and status icons meet the 3:1 contrast ratio against adjacent backgrounds.
- **Keyboard Trapping & Modals:** `Modal.tsx` and confirmation dialogues must consistently trap focus and restore focus to trigger elements upon dismissal (`Escape` key handling is present in `LiveClassroomPage` and `Modal`).
- **Screen Reader Labels:** Form inputs in `AuthPage`, `CourseCatalog`, and `CertificateVerifyPage` possess explicit `aria-label` or visible `<label>` tags with matching `htmlFor` attributes.
- **Motion Reduction:** Users with `prefers-reduced-motion: reduce` should have CSS animations (`speakRing`, `certShimmer`, floating reactions) automatically disabled or softened.

---

## 5. Multilingual Localization (English, Afaan Oromoo, Amharic)

EduSphere provides official national education in Ethiopia and internationally:
- **English (`en`):** Default administrative and higher education language.
- **Afaan Oromoo (`om`):** Latin-based alphabet (Qubee). Translations must support standard educational terminology (e.g., *Barnoota Olaanaa*, *Waraqaa Ragaa*, *Dhaabbilee Beekamtii*).
- **Amharic (`am`):** Ge'ez fidäl script. Must render with appropriate line-height (`1.6` to `1.8`) to prevent glyph clipping.
- **RTL Support (Arabic):** Direction attribute (`dir="rtl"`) is updated dynamically in `AppContext.tsx` on documentElement.

---

## 6. Actionable UI/UX Engineering Roadmap

1. **Step 1:** Audit and eliminate all hardcoded English strings in `AssessmentExamPlayer.tsx`, `LearnerDashboard.tsx`, and `LiveClassroomPage.tsx`, routing them through `useApp().t`.
2. **Step 2:** Build an enterprise **Assignment Submission & Review Drawer** for learners and instructors.
3. **Step 3:** Introduce a **Low-Bandwidth Mode** toggle in the user profile/header that simplifies video players into downloadable audio/text transcripts.
4. **Step 4:** Ensure all modal dialogues maintain strict focus trapping and keyboard navigation rings.
