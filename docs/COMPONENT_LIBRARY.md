# EDUSPHERE COMPONENT LIBRARY (ECL-v2)

**Architecture:** React 18, TypeScript, Tailwind CSS, Radix/ARIA accessibility guidelines  
**Design Tokens:** CSS Variables in `client/src/index.css`  
**Location:** `client/src/components/ui/`  
**Test Coverage:** Vitest + React Testing Library (28/28 verified passing)  

---

## 1. Component System Overview

EduSphere's component library provides high-density, accessible, multi-tenant UI primitives.
Every component strictly conforms to the following standards:
1. **WCAG 2.1 AA Compliant:** Accessible focus rings, contrasting borders, aria attributes (`aria-invalid`, `aria-describedby`, `aria-selected`, `aria-controls`), and minimum 44px mobile touch targets.
2. **Zero Mock Fallbacks:** Built for real asynchronous data lifecycles (loading, error, empty, populated).
3. **Resilient Multilingualism:** Layouts allow dynamic label expansion for Amharic and Afaan Oromoo without clipping or overflow.

---

## 2. Core Primitives & Components

### 1. `Button` (`Button.tsx`)
Interactive button with built-in loading spinner, icon slots, and accessible disabled states.

- **Props:**
  - `variant`: `'primary'` | `'secondary'` | `'teal'` | `'ghost'` | `'danger'` (default: `'primary'`)
  - `size`: `'sm'` | `'md'` | `'lg'` (default: `'md'`)
  - `isLoading`: `boolean` (displays an animated CSS spinner, disables pointer events)
  - `leftIcon` / `rightIcon`: `React.ReactNode`
  - `disabled`: `boolean`
  - Standard HTML button attributes (`onClick`, `type`, `aria-label`, etc.)

- **Usage:**
  ```tsx
  import { Button } from '@/components/ui';
  import { ArrowRight, Download } from 'lucide-react';

  <Button variant="primary" rightIcon={<ArrowRight size={16} />}>
    Continue Lesson
  </Button>

  <Button variant="secondary" isLoading={isSubmitting}>
    Save Draft
  </Button>
  ```

---

### 2. `Input` (`Input.tsx`)
Accessible form field with label, validation error feedback, helper text, and icon adornments.

- **Props:**
  - `label`: `string`
  - `error`: `string` (renders `role="alert"` message with danger icon)
  - `helperText`: `string`
  - `leftIcon` / `rightIcon`: `React.ReactNode`
  - `inputSize`: `'sm'` | `'md'` | `'lg'` (default: `'md'`)
  - `fullWidth`: `boolean` (default: `true`)
  - `required`: `boolean` (adds red required indicator and `required` attribute)
  - Standard HTML input attributes (`value`, `onChange`, `placeholder`, `disabled`, etc.)

- **Accessibility Features:**
  - Automatically associates `htmlFor` with generated `useId()`.
  - Sets `aria-invalid={true}` and `aria-describedby="[id]-error"` on validation failure.

- **Usage:**
  ```tsx
  import { Input } from '@/components/ui';
  import { Search, Mail } from 'lucide-react';

  <Input
    label="Search Syllabus"
    placeholder="Search lessons, topics, modules..."
    leftIcon={<Search size={16} />}
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  ```

---

### 3. `Select` (`Select.tsx`)
Accessible dropdown select primitive with styled SVG chevron, label, and validation states.

- **Props:**
  - `label`: `string`
  - `error`: `string`
  - `helperText`: `string`
  - `options`: `Array<{ value: string | number; label: string; disabled?: boolean }>`
  - `selectSize`: `'sm'` | `'md'` | `'lg'`
  - Standard HTML select attributes or nested `<option>` children.

- **Usage:**
  ```tsx
  import { Select } from '@/components/ui';

  <Select
    label="Academic Term"
    value={selectedTerm}
    onChange={(e) => setSelectedTerm(e.target.value)}
    options={[
      { value: 'fall-2026', label: 'Fall Semester 2026' },
      { value: 'spring-2027', label: 'Spring Semester 2027' },
    ]}
  />
  ```

---

### 4. `Card` (`Card.tsx`)
Structured container with discrete header, title, description, content, and footer sub-components.

- **Sub-components:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Variants:**
  - `'default'`: Crisp white canvas, 1px slate-200 border, micro shadow.
  - `'flat'`: Slate-50 background, subtle border, zero shadow.
  - `'elevated'`: Slate-200 border with shadow-md elevation.
  - `'interactive'`: Hover translateY(-2px), border highlight, keyboard focusable (`tabIndex={0}`, Enter/Space triggers `onClick`).
  - `'bordered'`: Transparent background with crisp 1px border.
- **Padding:** `'none'`, `'sm'`, `'md'`, `'lg'`.

- **Usage:**
  ```tsx
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from '@/components/ui';

  <Card variant="interactive" onClick={() => navigate('/courses/101')}>
    <CardHeader>
      <CardTitle>Cloud Native Microservices</CardTitle>
      <CardDescription>Accredited by Addis Ababa University</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Master distributed containers, gRPC, and Kubernetes orchestration.</p>
    </CardContent>
    <CardFooter>
      <span className="text-xs text-slate-500">12 Modules</span>
      <Button size="sm">Resume</Button>
    </CardFooter>
  </Card>
  ```

---

### 5. `Tabs` (`Tabs.tsx`)
Fully accessible ARIA tab navigation with keyboard arrow navigation and responsive overflow.

- **Props:**
  - `tabs`: `Array<{ id: string; label: string; icon?: React.ReactNode; count?: number; badge?: React.ReactNode; disabled?: boolean }>`
  - `activeTab`: `string`
  - `onChange`: `(tabId: string) => void`
  - `variant`: `'line'` | `'pills'` | `'segmented'` (default: `'line'`)
  - `size`: `'sm'` | `'md'` | `'lg'`
  - `ariaLabel`: `string` (default: `'Navigation Tabs'`)

- **Keyboard Behavior:**
  - `ArrowRight` / `ArrowLeft`: Moves focus and activates the next/previous enabled tab.
  - `Home` / `End`: Jumps to the first/last enabled tab.
  - Implements `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`.

- **Usage:**
  ```tsx
  import { Tabs } from '@/components/ui';
  import { BookOpen, Star, FileText } from 'lucide-react';

  <Tabs
    activeTab={activeTab}
    onChange={setActiveTab}
    variant="segmented"
    tabs={[
      { id: 'curriculum', label: 'Syllabus', icon: <BookOpen size={15} />, count: 18 },
      { id: 'reviews', label: 'Reviews', icon: <Star size={15} />, count: 42 },
      { id: 'resources', label: 'Resources', icon: <FileText size={15} /> },
    ]}
  />
  ```

---

### 6. `Badge` (`Badge.tsx`)
High-contrast status pill for verification seals, accreditation, and operational states.

- **Variants:**
  - `'primary'`: Cobalt blue fill (`--primary-light`), cobalt text.
  - `'teal'`: Emerald green fill (`--teal-50`), dark green text.
  - `'verified'`: Official academic credential seal (`#F0FDF4` / `#14532D`).
  - `'pending'`: Amber warning badge (`#FFFBEB` / `#78350F`).
  - `'danger'`: Red alert badge (`#FEF2F2` / `#991B1B`).
  - `'neutral'`: Slate neutral tag (`#F1F5F9` / `#475569`).

---

### 7. `StatCard` (`StatCard.tsx`)
Enterprise metric display card with title, value, icon, change indicators, and loading skeleton.

- **Props:**
  - `title`: `string`
  - `value`: `string | number`
  - `icon`: `React.ReactNode`
  - `trend`: `{ value: number; label?: string; direction?: 'up' | 'down' }`
  - `isLoading`: `boolean`

---

### 8. `EmptyState` (`EmptyState.tsx`)
Structured fallback display for empty datasets, searches with zero results, and zero enrollments.

- **Props:**
  - `title`: `string`
  - `description`: `string`
  - `icon`: `React.ReactNode`
  - `action`: `React.ReactNode` (e.g. primary CTA button)

---

### 9. `Modal` (`Modal.tsx`)
Accessible dialogue overlay with background backdrop blur, escape key dismissal, and focus trapping.

- **Props:**
  - `isOpen`: `boolean`
  - `onClose`: `() => void`
  - `title`: `string`
  - `children`: `React.ReactNode`
  - `footer`: `React.ReactNode`
  - `size`: `'sm'` | `'md'` | `'lg'` | `'xl'`

---

### 10. `Skeleton` (`Skeleton.tsx`)
Shimmer loading placeholder maintaining layout stability and preventing layout shifts (CLS).

- **Variants:**
  - `Skeleton`: Standard width/height block.
  - `SkeletonText`: Multi-line paragraph placeholder.
  - `SkeletonCard`: Complete card placeholder.

---

### 11. `DataState` (`DataState.tsx`)
Higher-order wrapper handling `isLoading`, `error`, `isEmpty`, and populated data states cleanly.

---

### 12. `ErrorBoundary` (`ErrorBoundary.tsx`)
React class boundary preventing catastrophic white screens, capturing stack traces, and offering a one-click session reload.
