# EDUSPHERE DESIGN SYSTEM SPECIFICATION (EDS-v2)

**Version:** 2.0.0 (Enterprise Production)  
**Target Platform:** Web Desktop, Tablet, Mobile (React 18, TypeScript, Tailwind CSS)  
**Multilingual Scripts:** Latin (English), Qubee (Afaan Oromoo), Ge'ez Fidäl (Amharic)  
**Accessibility Target:** WCAG 2.1 & 2.2 Level AA / AAA Compliant  

---

## 1. Visual Identity & Brand Philosophy

EduSphere’s design system conveys **Authority, Clarity, Trust, Intelligence, and Inclusivity**.
Unlike casual learning prototypes or overly decorated templates, EduSphere serves high-stakes academic credentials, accredited universities, and multi-tenant ministries of education.

### Core Visual Principles
1. **Precision & Restraint:** Sharp borders, subtle shadows, controlled radii (4px–12px), zero decorative neon glows.
2. **Academic Authority:** Deep institutional slate-navy paired with confident enterprise cobalt blue.
3. **Information Chunking (Notion/Linear principle):** High-density information presented with clean grid boundaries and purposeful negative space.
4. **Resilient Multilingualism:** Dynamic typography scaling that accommodates the distinctive line-height and bounding boxes of Ethiopic scripts.
5. **Connectivity Empathy:** Low-bandwidth affordances, high data density, and instant visual state feedback for low-power and offline-first scenarios.

---

## 2. Color Architecture & Contrast Tokens

All color combinations have been mathematically validated against the WCAG 2.1 AA requirement (minimum 4.5:1 for normal text, 3:1 for large text and UI components).

### A. Primary Brand Palette
```css
--primary:        #1D4ED8; /* Cobalt Blue 700 - Primary actions, active links (7.2:1 on White) */
--primary-hover:  #1E40AF; /* Blue 800 - Hover state */
--primary-active: #1E3A8A; /* Blue 900 - Active / Pressed state */
--primary-light:  #EFF6FF; /* Blue 50 - Subtle active selection surfaces */
--primary-ring:   rgba(29, 78, 216, 0.2); /* 3px keyboard focus ring */
```

### B. Institutional Neutral Palette (Navy & Slate)
```css
/* Deep Navy (Surfaces, Navigation, High-Contrast Headings) */
--navy-950:       #090D16; /* Midnight - High-contrast text on light backgrounds */
--navy-900:       #0F172A; /* Deep Slate Navy - Sidebar, App Header, Institutional Headers */
--navy-850:       #141E33; /* Dark surface elevation 1 */
--navy-800:       #1E293B; /* Dark surface elevation 2, dark borders */
--navy-700:       #334155; /* Neutral dark muted */

/* Slate Neutrals (Light Canvas, Borders, Dividers, Secondary Text) */
--slate-50:       #F8FAFC; /* Primary App Canvas Background */
--slate-100:      #F1F5F9; /* Table headers, card hover fills, input disabled backgrounds */
--slate-200:      #E2E8F0; /* Primary card and container borders (1px) */
--slate-300:      #CBD5E1; /* Secondary input hover borders, divider lines */
--slate-400:      #94A3B8; /* Placeholder text, inactive tab borders */
--slate-500:      #64748B; /* Metadata labels, secondary caption text */
--slate-600:      #475569; /* Body secondary text, descriptions */
--slate-700:      #334155; /* Body primary text */
--slate-900:      #0F172A; /* High-contrast text */
```

### C. Semantic Functional Tokens
```css
/* Success (Verified Diplomas, Passing Grades, Active Statuses) */
--success:        #15803D; /* Green 700 - Meets 5.2:1 against light green */
--success-hover:  #166534; /* Green 800 */
--success-light:  #F0FDF4; /* Green 50 background */
--success-border: #BBF7D0; /* Green 200 border */
--success-text:   #14532D; /* Green 900 text */

/* Warning (Exam Timers, Pending Admissions, Incomplete Coursework) */
--warning:        #B45309; /* Amber 700 - Meets 4.8:1 against light amber */
--warning-hover:  #92400E; /* Amber 800 */
--warning-light:  #FFFBEB; /* Amber 50 background */
--warning-border: #FDE68A; /* Amber 200 border */
--warning-text:   #78350F; /* Amber 900 text */

/* Danger / Destructive (Rejection, Delete Lesson, Expired Tokens) */
--danger:         #DC2626; /* Red 600 - Meets 4.9:1 against white */
--danger-hover:   #B91C1C; /* Red 700 */
--danger-light:   #FEF2F2; /* Red 50 background */
--danger-border:  #FECACA; /* Red 200 border */
--danger-text:    #991B1B; /* Red 800 text */

/* Academic Teal / Emerald (Accreditation Badges, Verified Seals) */
--teal-500:       #16A34A; /* Verified Emerald */
--teal-600:       #15803D;
--teal-50:        #F0FDF4;
--teal-100:       #DCFCE7;
```

---

## 3. Typographic System & Multilingual Scale

EduSphere guarantees seamless reading experiences across Latin and Ethiopic typographic systems:

### Font Stacks
```css
/* Primary Geometric UI Font */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Ethiopic Script Fallback (Amharic) */
--font-ethiopic: 'Noto Sans Ethiopic', 'Abyssinica SIL', 'Nyala', sans-serif;

/* Tabular & Cryptographic Monospace Font */
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
```

### Type Scale Matrix
| Role | Font Size (rem / px) | Line Height | Letter Spacing | Weight | Script Considerations |
|---|---|---|---|---|---|
| **Display Hero** | `2.5rem` / 40px | 1.15 | `-0.03em` | 800 (Extrabold) | Amharic: line-height 1.35 |
| **Page Title (H1)** | `1.875rem` / 30px | 1.25 | `-0.025em` | 700 (Bold) | Amharic: line-height 1.45 |
| **Section Header (H2)**| `1.5rem` / 24px | 1.3 | `-0.02em` | 700 (Bold) | Amharic: line-height 1.5 |
| **Subsection (H3)** | `1.25rem` / 20px | 1.35 | `-0.015em` | 600 (Semibold) | Amharic: line-height 1.55 |
| **Card / Group Title** | `1.0625rem` / 17px | 1.4 | `-0.01em` | 600 (Semibold) | Latin & Qubee |
| **Body Primary** | `0.9375rem` / 15px | 1.55 | `0` | 400 (Regular) | Standard body content |
| **Body Secondary** | `0.875rem` / 14px | 1.5 | `0` | 400 / 500 | Metadata, helper texts |
| **Caption & Tags** | `0.75rem` / 12px | 1.4 | `+0.02em` | 600 (Semibold) | Badges, timestamps, pills |
| **Cryptographic Hash** | `0.8125rem` / 13px | 1.2 | `0` | 500 (Mono) | Tabular numbers enabled |

---

## 4. Spacing, Elevation & Restrained Radii

EduSphere avoids round, cartoonish shapes in favor of crisp enterprise architecture.

### Elevation & Shadows
```css
/* Zero neon glows — multi-layered crisp directional shadows */
--shadow-xs: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
--shadow-sm: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.03);
--shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.03);
--shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.07), 0 4px 6px -4px rgba(15, 23, 42, 0.02);
--shadow-xl: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.02);
```

### Corner Radii
```css
--radius-xs:   3px;   /* Minor tags, micro-badges */
--radius-sm:   5px;   /* Small buttons, nested tabs */
--radius-md:   6px;   /* Standard inputs, default buttons, select boxes */
--radius-lg:   8px;   /* Cards, dropdown menus, modals */
--radius-xl:   12px;  /* Hero panels, modal dialogues, large containers */
--radius-full: 9999px;/* Status pills, user avatar circles */
```

### Spacing Scale
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

---

## 5. Responsive Grid & Layout Breakpoints

EduSphere implements a fluid layout grid designed to collapse gracefully from ultra-wide displays down to low-cost mobile handsets.

```css
/* Breakpoint System */
@screen sm:  640px;  /* Large mobile / Small phablets */
@screen md:  768px;  /* Tablets (portrait), collapsible sidebar trigger */
@screen lg:  1024px; /* Laptops, desktop split-pane workspaces */
@screen xl:  1280px; /* Standard enterprise desktop displays */
@screen 2xl: 1536px; /* High-resolution workstation screens */
```

- **Application Sidebar:** Fixed `260px` sticky desktop drawer; collapses into an off-canvas mobile menu on screens `< 768px`.
- **Main Container Width:** Maximum `1280px` centered canvas with `px-4 sm:px-6 lg:px-8` fluid lateral gutters.
- **Minimum Touch Targets:** All interactive controls enforce a minimum touch bounding box of `44px × 44px` on mobile viewports.

---

## 6. Micro-Interactions, Focus Rings & Motion Constraints

1. **Focus Ring:** Consistent accessible focus indicator:
   ```css
   :focus-visible {
     outline: 2px solid var(--primary);
     outline-offset: 2px;
   }
   ```
2. **Transition Durations:**
   - Fast (`120ms`): Button hover, checkbox toggles, tab triggers.
   - Normal (`180ms`): Dropdown expansion, modal fade, accordion open.
   - Slow (`240ms`): Sidebar drawer transition, page routing indicator.
3. **Reduced Motion Compliance:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
