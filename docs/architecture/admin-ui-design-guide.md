# Admin UI Design Guide

## Overview

This document defines the visual design system, interaction patterns, and component guidelines for the Kiosk App admin interface. The admin interface is designed for mobile-first configuration on phones/laptops, prioritizing clarity, safety, and accessibility.

**Target Audience:** Administrators configuring the kiosk system
**Primary Devices:** Mobile phones (320px+), tablets, laptops
**Design Philosophy:** Mobile-first, touch-friendly, fail-safe

---

## Design Principles

### 1. **Mobile-First Responsive**
- Design for small screens first (min 320px width)
- Progressive enhancement for larger viewports
- Touch-friendly tap targets (minimum 44x44px)
- Readable text sizes (minimum 16px for body)

### 2. **Safety & Confirmation**
- Destructive actions require explicit confirmation
- Clear warnings for irreversible operations
- Progressive disclosure (show complexity only when needed)
- Escape hatches (cancel buttons, back links)

### 3. **Clarity & Simplicity**
- One primary action per screen
- Minimal cognitive load
- Clear visual hierarchy
- Consistent patterns across pages

### 4. **Accessibility**
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Color contrast compliance (WCAG AA minimum)

---

## Color System

### Primary Palette

```css
/* Primary - Actions, Links */
--color-primary-50:  #eff6ff;   /* Light backgrounds */
--color-primary-100: #dbeafe;   /* Hover states */
--color-primary-200: #bfdbfe;   /* Borders */
--color-primary-600: #2563eb;   /* Primary buttons, links */
--color-primary-700: #1d4ed8;   /* Hover/active */

/* Danger - Destructive Actions */
--color-danger-50:  #fef2f2;    /* Light backgrounds */
--color-danger-200: #fecaca;    /* Borders */
--color-danger-600: #dc2626;    /* Danger buttons */
--color-danger-700: #b91c1c;    /* Hover/active */
--color-danger-800: #991b1b;    /* Text */

/* Success - Confirmations */
--color-success-50:  #f0fdf4;   /* Light backgrounds */
--color-success-200: #bbf7d0;   /* Borders */
--color-success-700: #15803d;   /* Text */

/* Warning - Alerts */
--color-warning-50:  #fffbeb;   /* Light backgrounds */
--color-warning-600: #ca8a04;   /* Text */

/* Neutral - Text, Backgrounds */
--color-gray-50:  #f9fafb;      /* Page backgrounds */
--color-gray-200: #e5e7eb;      /* Borders, disabled */
--color-gray-300: #d1d5db;      /* Input borders */
--color-gray-600: #4b5563;      /* Secondary text */
--color-gray-700: #374151;      /* Labels */
--color-gray-800: #1f2937;      /* Primary text */
--color-gray-900: #111827;      /* Headings */
```

### Usage Guidelines

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary button | Blue 600 | `bg-blue-600` |
| Primary button hover | Blue 700 | `hover:bg-blue-700` |
| Danger button | Red 600 | `bg-red-600` |
| Success message | Green 50 bg, Green 700 text | `bg-green-50 text-green-700` |
| Error message | Red 50 bg, Red 700 text | `bg-red-50 text-red-700` |
| Warning message | Yellow 50 bg, Yellow 600 text | `bg-yellow-50 text-yellow-600` |
| Page background | Gray 50 | `bg-gray-50` |
| Card background | White | `bg-white` |
| Body text | Gray 800 | `text-gray-800` |
| Secondary text | Gray 600 | `text-gray-600` |
| Headings | Gray 900 | `text-gray-900` |

---

## Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Helvetica Neue', Arial, sans-serif;
```

### Type Scale

| Element | Size | Weight | Tailwind |
|---------|------|--------|----------|
| Page heading (H1) | 30px / 1.875rem | Bold 700 | `text-3xl font-bold` |
| Section heading (H2) | 20px / 1.25rem | Semibold 600 | `text-xl font-semibold` |
| Subsection (H3) | 18px / 1.125rem | Semibold 600 | `text-lg font-semibold` |
| Body text | 16px / 1rem | Normal 400 | `text-base` |
| Small text | 14px / 0.875rem | Normal 400 | `text-sm` |
| Label text | 14px / 0.875rem | Medium 500 | `text-sm font-medium` |
| Button text | 16px / 1rem | Medium 500 | `text-base font-medium` |
| Code | 14px / 0.875rem | Mono | `text-sm font-mono` |

### Line Height
- **Headings:** 1.2 (tight) - `leading-tight`
- **Body text:** 1.5 (normal) - `leading-normal`
- **Small text:** 1.5 (normal) - `leading-normal`

---

## Spacing System

Use Tailwind's 4px-based spacing scale:

| Value | Pixels | Usage |
|-------|--------|-------|
| `gap-2`, `space-y-2` | 8px | Tight spacing (label-input) |
| `gap-3`, `space-y-3` | 12px | Button groups |
| `gap-4`, `space-y-4` | 16px | Form fields, stacked inputs |
| `gap-6`, `space-y-6` | 24px | Sections within a form |
| `p-4` | 16px | Small card padding |
| `p-6` | 24px | Standard card padding |
| `p-8` | 32px | Large card padding |
| `mb-4` | 16px | Section bottom margin |
| `mb-6` | 24px | Heading bottom margin |
| `mt-2` | 8px | Help text top margin |

---

## Layout Patterns

### 1. Centered Card (Auth Pages)

**Use for:** Login, Setup, Single-purpose forms

```html
<div className="flex items-center justify-center min-h-screen">
  <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
    <h1 className="text-3xl font-bold mb-6">[Title]</h1>
    <!-- Content -->
  </div>
</div>
```

**Specifications:**
- Centered vertically and horizontally
- Max width: 28rem (448px)
- Padding: 2rem (32px)
- Shadow: `shadow-lg`
- Border radius: 8px (`rounded-lg`)

### 2. Full-Width with Max Width (Settings Pages)

**Use for:** Settings, complex forms, content-heavy pages

```html
<div className="min-h-screen bg-gray-50">
  <!-- Header -->
  <div className="bg-white shadow">
    <div className="max-w-4xl mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold text-gray-900">[Title]</h1>
    </div>
  </div>

  <!-- Content -->
  <div className="max-w-4xl mx-auto px-4 py-8">
    <!-- Sections -->
  </div>
</div>
```

**Specifications:**
- Max content width: 56rem (896px)
- Gray background: `bg-gray-50`
- Header: White with shadow
- Content padding: 1rem horizontal, 2rem vertical

### 3. Full-Screen Display (TV Display)

**Use for:** Setup code display, status screens

```html
<div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
  <div className="text-center">
    <!-- Large, centered content -->
  </div>
</div>
```

**Specifications:**
- Dark background: `bg-gray-900`
- White text
- Centered content
- Large typography for visibility

---

## Component Specifications

### Button Component

#### Variants

**Primary (Default)**
```html
<Button>Label</Button>
<!-- or -->
<Button variant="primary">Label</Button>
```
- Background: Blue 600 (`bg-blue-600`)
- Hover: Blue 700 (`hover:bg-blue-700`)
- Text: White
- Use for: Main actions, form submissions

**Secondary**
```html
<Button variant="secondary">Label</Button>
```
- Background: Gray 200 (`bg-gray-200`)
- Hover: Gray 300 (`hover:bg-gray-300`)
- Text: Gray 800
- Use for: Cancel, back, alternative actions

**Danger**
```html
<Button variant="danger">Label</Button>
```
- Background: Red 600 (`bg-red-600`)
- Hover: Red 700 (`hover:bg-red-700`)
- Text: White
- Use for: Delete, reset, destructive actions

#### Specifications
- Padding: `px-6 py-3` (24px horizontal, 12px vertical)
- Border radius: 8px (`rounded-lg`)
- Font: Medium 500
- Transition: `transition-colors`
- Disabled state: 50% opacity, no hover effect

#### Button Groups

**Horizontal (Side by side)**
```html
<div className="flex gap-3">
  <Button variant="secondary">Cancel</Button>
  <Button>Confirm</Button>
</div>
```

**Vertical (Stacked)**
```html
<div className="space-y-3">
  <Button className="w-full">Primary Action</Button>
  <Button variant="secondary" className="w-full">Secondary</Button>
</div>
```

**Equal Width Split**
```html
<div className="flex gap-3">
  <Button variant="secondary" className="flex-1">Cancel</Button>
  <Button className="flex-1">Save</Button>
</div>
```

---

### Input Component

#### Structure

```html
<Input
  label="Field Label"
  type="text"
  value={value}
  onChange={setValue}
  placeholder="Enter value..."
  required
  error={error}
/>
```

#### Specifications

**Label**
- Font size: 14px (`text-sm`)
- Font weight: Medium 500 (`font-medium`)
- Color: Gray 700 (`text-gray-700`)
- Margin bottom: 8px (built into component with `gap-2`)
- Required indicator: Red asterisk

**Input Field**
- Padding: `px-4 py-2` (16px horizontal, 8px vertical)
- Border: 1px Gray 300 (`border border-gray-300`)
- Border radius: 8px (`rounded-lg`)
- Focus: Blue ring, 2px (`focus:ring-2 focus:ring-blue-500`)
- Error state: Red border (`border-red-500`)
- Font size: 16px (prevents zoom on mobile)

**Error Message**
- Font size: 14px (`text-sm`)
- Color: Red 600 (`text-red-600`)
- Margin top: 4px (built into component)

**Help Text (Optional)**
```html
<p className="text-sm text-gray-500 mt-2">
  Helpful description or hint
</p>
```

#### Input Types

| Type | Purpose | Pattern |
|------|---------|---------|
| `text` | General text | - |
| `password` | PINs, secrets | `[0-9]{4,8}` for PINs |
| `number` | Numeric values | - |
| `url` | Web addresses | - |
| `email` | Email addresses | - |

---

### Alert / Message Boxes

#### Success Message

```html
<div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded mb-6">
  ✓ Settings saved successfully
</div>
```

#### Error Message

```html
<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
  {errorMessage}
</div>
```

#### Warning Message

```html
<div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
  ⚠️ Warning text here
</div>
```

#### Info Message

```html
<div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
  ℹ️ Informational text here
</div>
```

#### Specifications
- Border: 1px solid, color matches background
- Padding: 16px vertical, 24px horizontal
- Border radius: 4px (`rounded`)
- Margin bottom: 24px when stacked (`mb-6`)

---

### Loading States

#### Full-Page Loading

```html
<div className="flex items-center justify-center min-h-screen">
  <div className="flex flex-col items-center gap-4">
    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    <p className="text-gray-600">Loading...</p>
  </div>
</div>
```

#### Button Loading State

```html
<Button disabled={loading}>
  {loading ? 'Saving...' : 'Save'}
</Button>
```

#### Specifications
- Spinner: 64px diameter, blue gradient
- Animation: CSS spin
- Text: Gray 600, below spinner
- Gap: 16px between spinner and text

---

### Form Sections

#### Section Structure

```html
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <h2 className="text-xl font-semibold mb-4">Section Title</h2>

  <!-- Single input -->
  <Input ... />

  <!-- Or multiple inputs with spacing -->
  <div className="space-y-4">
    <Input ... />
    <Input ... />
  </div>

  <!-- Help text -->
  <p className="text-sm text-gray-500 mt-2">
    Additional information or help text
  </p>
</div>
```

#### Grid Layout (Multiple Columns)

```html
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input label="First Name" ... />
  <Input label="Last Name" ... />
</div>
```

- Mobile: Single column (`grid-cols-1`)
- Desktop: Two columns (`md:grid-cols-2`)
- Gap: 16px (`gap-4`)

---

## Interaction Patterns

### 1. Form Submission

**Pattern:**
1. User fills form
2. Clicks submit button
3. Button shows loading state (disabled, text changes)
4. On success: Show success message, redirect or close
5. On error: Show error message, keep form data

**Example:**
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState(false);

const handleSubmit = async () => {
  try {
    setLoading(true);
    setError(null);
    await saveData();
    setSuccess(true);
    // Optional: Auto-redirect after delay
    setTimeout(() => route('/next-page'), 1500);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 2. Destructive Action Confirmation

**Pattern:**
1. User clicks dangerous button (delete, reset)
2. Show confirmation dialog or separate page
3. Require explicit confirmation (text input or checkbox)
4. Require authentication (PIN)
5. Show warning about consequences
6. Provide escape hatch (cancel button)

**Example: Factory Reset**
- Dedicated page with warning boxes
- Requires typing "RESET" exactly
- Requires PIN authentication
- Shows what will be deleted
- Suggests alternatives
- Cancel button prominent

### 3. Multi-Step Wizard

**Pattern:**
1. Show progress indicator
2. One step per screen
3. Validate each step before proceeding
4. Allow back navigation
5. Show summary before final submission

**Progress Indicator:**
```html
<div className="flex justify-between items-center mb-8">
  <div className="flex items-center flex-1">
    <div className="w-8 h-8 rounded-full bg-blue-600 text-white">1</div>
    <div className="flex-1 h-1 bg-blue-600 mx-2" />
  </div>
  <div className="flex items-center flex-1">
    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600">2</div>
    <div className="flex-1 h-1 bg-gray-300 mx-2" />
  </div>
  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600">3</div>
</div>
```

### 4. Modal Dialogs

**Pattern:**
1. Overlay entire screen with semi-transparent backdrop
2. Center modal content
3. Clear heading
4. Focused content
5. Action buttons at bottom
6. Close on backdrop click or Escape key

**Structure:**
```html
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
    <h2 className="text-xl font-bold mb-4">Modal Title</h2>
    <p className="text-gray-600 mb-4">Modal content...</p>

    <div className="flex gap-3 mt-6">
      <Button variant="secondary" onClick={onClose} className="flex-1">
        Cancel
      </Button>
      <Button onClick={onConfirm} className="flex-1">
        Confirm
      </Button>
    </div>
  </div>
</div>
```

---

## Responsive Design

### Breakpoints

```css
/* Tailwind default breakpoints */
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Laptops */
xl:  1280px  /* Desktops */
```

### Mobile-First Approach

Write mobile styles first, then enhance for larger screens:

```html
<!-- Mobile: Stacked, Desktop: Side-by-side -->
<div className="flex flex-col md:flex-row gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

<!-- Mobile: Full width buttons, Desktop: Inline -->
<div className="space-y-3 md:space-y-0 md:flex md:gap-3">
  <Button className="w-full md:w-auto">Button 1</Button>
  <Button className="w-full md:w-auto">Button 2</Button>
</div>
```

### Touch Targets

- Minimum size: 44x44px
- Adequate spacing between tappable elements
- Buttons use `px-6 py-3` = 48px height minimum
- Icons in buttons should be 20-24px

---

## Accessibility

### Semantic HTML

- Use `<button>` for actions, not `<div onClick>`
- Use `<a>` for navigation
- Use `<form>` and `<input>` elements
- Use heading hierarchy (`<h1>`, `<h2>`, etc.)

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Visible focus states (`:focus` ring)
- Logical tab order
- Enter key submits forms
- Escape key closes modals

### ARIA Labels

Add when semantic HTML isn't sufficient:

```html
<button aria-label="Close modal">
  <svg><!-- X icon --></svg>
</button>

<div role="alert" aria-live="polite">
  {errorMessage}
</div>
```

### Color Contrast

- **Normal text (16px+):** Minimum 4.5:1 ratio
- **Large text (18px+/24px bold):** Minimum 3:1 ratio
- **UI components:** Minimum 3:1 ratio

**Verified combinations:**
- Gray 800 on White: ✓ 8.6:1
- Gray 600 on White: ✓ 5.7:1
- Blue 600 on White: ✓ 5.8:1
- Red 600 on White: ✓ 6.5:1

---

## Error Handling

### Error Message Guidelines

**Do:**
- Be specific about what went wrong
- Suggest how to fix it
- Use plain language
- Show where the error occurred (field-level)

**Don't:**
- Show technical error codes to users
- Use jargon or system messages
- Blame the user ("You did X wrong")
- Hide errors silently

### Error Examples

**Good:**
```
"PIN must be 4-8 digits"
"Email address is required"
"Session expired. Please log in again."
```

**Bad:**
```
"Error: INVALID_INPUT_FORMAT"
"Failed to authenticate user session token"
"null is not an object"
```

### Error Placement

1. **Field-level errors:** Show below the input field (red text)
2. **Form-level errors:** Show at top of form (red alert box)
3. **Page-level errors:** Show at top of page (red alert box)
4. **Network errors:** Show toast notification or banner

---

## Best Practices

### Performance

- Lazy load heavy components
- Debounce search inputs (300ms)
- Show loading states for async operations > 200ms
- Optimize images (use appropriate formats and sizes)

### Security

- Never expose sensitive data in URLs
- Use `type="password"` for PINs and secrets
- Clear sensitive form data after submission
- Show masked values (●●●●) for secrets
- Rate limit failed authentication attempts

### User Experience

- Provide immediate feedback for all actions
- Save form progress when possible
- Auto-focus first input field
- Remember user preferences
- Provide helpful placeholder text
- Show character counts for limited fields

### Content Guidelines

- Use sentence case for labels ("First name", not "First Name")
- Use title case for buttons and headings ("Save Changes")
- Write concise, actionable button labels ("Save", not "Click here to save")
- Use present tense for actions ("Delete", not "Deleted")
- Avoid technical jargon
- Be consistent with terminology

---

## Component Checklist

Use this checklist when creating new admin components:

### Visual Design
- [ ] Colors match design system
- [ ] Typography follows scale
- [ ] Spacing uses system values
- [ ] Shadows appropriate for elevation
- [ ] Border radius consistent

### Responsive Design
- [ ] Mobile-first approach
- [ ] Works at 320px width
- [ ] Touch targets minimum 44px
- [ ] Text readable (16px minimum)
- [ ] Layout adapts to viewport

### Accessibility
- [ ] Semantic HTML elements
- [ ] Keyboard navigable
- [ ] Visible focus states
- [ ] ARIA labels where needed
- [ ] Color contrast compliant

### Interaction
- [ ] Loading states shown
- [ ] Error messages clear
- [ ] Success feedback visible
- [ ] Disabled states obvious
- [ ] Hover states appropriate

### Code Quality
- [ ] TypeScript types defined
- [ ] Props documented
- [ ] Reusable where possible
- [ ] No hardcoded values
- [ ] Follows existing patterns

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-21 | Initial design guide created |
