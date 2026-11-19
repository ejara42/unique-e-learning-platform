# EDUSPHERE RESPONSIVE DESIGN GUIDE (ERDG-v2)

**Standard:** Multi-Device Enterprise Accessibility  
**Supported Devices:** Ultra-Wide Desktops (1440px+), Standard Desktops / Laptops (1024px–1280px), Tablets (768px–1023px), Mobile Smartphones (360px–767px)  
**Status:** Approved Specification  

---

## 1. Breakpoint Philosophy & Matrix

EduSphere enforces an adaptive, content-first responsive architecture. We avoid merely shrinking desktop components; instead, information density, navigation paradigms, and touch ergonomics transform across four distinct viewport tiers:

| Tier | Breakpoint Query | Primary Target Devices | Layout Paradigm | Navigation Pattern |
|---|---|---|---|---|
| **Tier 1: Mobile Phone** | `< 640px` (sm) | iPhone SE, iPhone 15, Android budget handsets (360px–430px) | Single-column stacked, full-width actions, touch-optimized (min 44px) | Collapsible bottom drawer & hamburger menu; sticky bottom CTA |
| **Tier 2: Phablet / Small Tablet** | `640px – 767px` | iPad Mini (portrait), Galaxy Fold (unfolded) | 1–2 column adaptive grid, horizontal scroll chips | Collapsible top drawer navigation |
| **Tier 3: Tablet & Laptop** | `768px – 1023px` (md to lg) | iPad Pro, Surface Pro, Chromebooks (1024x768) | Multi-column dashboard grid, collapsible left sidebar | Sticky compact sidebar or top app bar |
| **Tier 4: Enterprise Desktop** | `1024px – 1440px+` (lg, xl, 2xl) | MacBook Pro, 1080p monitors, 1440p workstations | Full split-pane workspace, persistent 260px sidebar, high-density data tables | Persistent sidebar navigation with active indicator |

---

## 2. Core Layout Adaptations

### A. Application Shell & Sidebar (`.dashboard-layout`, `.app-sidebar`)
- **Desktop (`>= 769px`):**
  - Left sidebar is persistent and sticky: `width: 260px`, `height: 100vh`, `position: sticky; top: 0;`.
  - Main workspace fills remaining width: `flex: 1; padding: 32px 40px; min-width: 0;`.
- **Mobile & Tablet (`<= 768px`):**
  - Sidebar transforms into a horizontal, top-mounted quick-switcher or slides into an accessible off-canvas drawer.
  - Workspace padding reduces to `18px 16px` to maximize screen real estate.
  - Horizontal scrolling enabled with subtle momentum damping (`-webkit-overflow-scrolling: touch`).

### B. Course Discovery Grid (`LandingPage.tsx`, `MyCoursesPage.tsx`)
- **Grid Strategy:**
  - `xl` (1280px+): 3 equal columns (`grid-template-columns: repeat(3, minmax(0, 1fr))`, `gap: 24px`).
  - `md` (768px–1023px): 2 equal columns (`grid-template-columns: repeat(2, minmax(0, 1fr))`, `gap: 20px`).
  - `sm` (< 768px): Single full-width card column (`grid-template-columns: 1fr`, `gap: 16px`).
- **Touch Adaptations:**
  - Course card thumbnail images use a fixed 16:9 aspect ratio (`aspect-video`).
  - "Enroll Now" and "Continue Lesson" buttons span full card width on screens `< 640px`.

### C. Course Detail & Syllabus View (`CourseDetailPage.tsx`)
- **Desktop (`>= 1024px`):**
  - Split grid: Left pane (65%) hosts syllabus tabs, instructor credentials, and reviews; Right pane (35%) hosts sticky enrollment card with price, guarantee badge, and action button.
- **Mobile (`< 1024px`):**
  - Columns collapse into a single vertical stream.
  - Sticky right pane transforms into a clean, floating bottom action bar (`position: fixed; bottom: 0; inset-x: 0; z-index: 50;`) allowing one-tap enrollment without scrolling back to the top.

### D. Lesson & Video Player Workspace (`LessonPlayerPage.tsx`)
- **Desktop:**
  - 16:9 main video canvas on the left (70%), collapsible lesson syllabus playlist on the right (30%).
- **Tablet / Mobile:**
  - Video player is pinned to the top of the viewport (`aspect-video w-full`).
  - Syllabus and notes switch to a swipeable bottom tab drawer to prevent interrupting playback.

---

## 3. Touch Targets, Typography & Form Ergonomics

### A. Touch Target Sizing (WCAG 2.5.5 & 2.5.8)
- Every interactive element (buttons, tabs, inputs, dropdown triggers, checkboxes) enforces a minimum bounding box of **44px × 44px** on viewports `< 768px`.
- Spacing between adjacent interactive links in lists or tables is at least **8px** to prevent accidental mis-taps.

### B. Form Inputs on iOS Safari
- Input font size is strictly set to **16px (`1rem`)** on screens `< 768px` (`font-size: 16px !important;`). This eliminates automatic iOS Safari zoom-in behavior that causes unwanted horizontal scrolling.

### C. Responsive Data Tables (`.table-responsive`, `.data-table`)
- Tables in `AdminDashboard.tsx` and `TeacherCourseStudio.tsx` are wrapped in an overflow container:
  ```css
  .table-responsive {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: var(--radius-lg);
  }
  ```
- Priority columns (Name, Status, Primary Action) are pinned or given minimum widths (`min-w-[140px]`), while secondary columns (Created Date, Tenant ID) gracefully scroll horizontally without truncating table content.

---

## 4. Zero Horizontal Overflow Enforcement

To guarantee no horizontal layout shifts or clipped content:
1. All root containers use `max-w-full overflow-x-hidden`.
2. Text blocks utilize `break-words` and `hyphens-auto` for long cryptographic hashes, email addresses, and course titles.
3. Code blocks and SHA-256 verification stamps use `overflow-x-auto` with styled scrollbars.
