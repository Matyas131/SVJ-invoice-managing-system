# Design System Guidelines

This document outlines the rules, conventions, and style choices for the SVJ Invoice Managing System. Follow this guide when creating new features, modifying UI elements, or styling components to maintain visual consistency.

---

## 1. Color Palette

The color system is designed for a high-contrast dark mode with a technical, monospaced layout.

### Background Colors
- **Main App Background**: `#0d0e10`
- **Dashboard Tile & Modal Background**: `#1c1d1f`
- **Inner Inputs, Form Cards, & List Rows Background**: `#131416`
- **Backdrop Overlay (Modals)**: `rgba(0, 0, 0, 0.85)` with `backdrop-blur-sm`

### Accents
- **Primary Tan/Beige Accent**: `#c9c7b9` (Used for action buttons, headings, and highlighting special badges. Hover state transitions to `#ffffff`).
- **Secondary Slate Blue-Grey**: `#4f6272` (Used for primary tiles, progress indicators, circular dials, and selected items).

### Statuses
- **Success / Paid / Credit**: `text-emerald-400` / `bg-emerald-500/10` / `border-emerald-500/20`
- **Warning / Unpaid / Pending**: `text-amber-400` / `bg-amber-500/10` / `border-amber-500/20`
- **Error / Destructive / Delete**: `text-rose-400` / `bg-rose-500/10` / `border-rose-500/20` / `bg-rose-950/40`

### Borders & Muted Elements
- **Standard Card Borders**: `#2b2c2f` (often with `40%` opacity, e.g., `border-[#2b2c2f]/40`)
- **Dividers & Table Lines**: `#232427` or `#2b2c2f`
- **Secondary / Muted Text**: `text-zinc-400` or `text-zinc-500`
- **Very Muted Labels / Icons**: `text-zinc-600` or `text-zinc-700`

---

## 2. Typography

The system features three fonts loaded via Next.js Google Fonts and configured through Tailwind 4.

### Font Configurations
1. **Sans-Serif Font (Geist)**:
   - CSS Variable: `--font-geist-sans`
   - Tailwind class: `font-sans`
   - *Usage*: General interface text, metadata, standard readable copy.
2. **System Code/Monospace Font (JetBrains Mono)**:
   - CSS Variable: `--font-geist-mono`
   - Tailwind class: `font-mono`
   - *Usage*: **Default body text** for the entire dashboard. Brings a structured "terminal" look to all listings, forms, and general content.
3. **Digital LED/Scores Font (Share Tech Mono)**:
   - CSS Variable: `--font-share-tech-mono`
   - Tailwind class: `font-digital`
   - *Usage*: Large metric counts, reward values, dates, and amounts (e.g. `+1,200 CZK`). Gives an LED digital-display dashboard vibe.

### Font Sizes & Weights
- **Large Metrics**: `text-7xl` or `text-8xl` (sometimes `text-9xl` on columns), `font-semibold` or `font-bold` with `font-digital`.
- **Card Headers**: `text-[11px]`, `font-bold`, `tracking-widest`, `uppercase`.
- **Table / List Labels**: `text-[10px]`, `font-bold`, `uppercase`, `text-zinc-500`.
- **Body & Inputs Text**: `text-sm` or `text-xs`, `font-mono`.

---

## 3. Spacing & Layout

Visual structure relies on clean gaps, responsive padding, and flex properties.

### Responsive Margins
- **Page Container Padding**: `pt-4 sm:pt-6 lg:pt-8 xl:pt-12 px-4 sm:px-6 lg:px-8 xl:px-12 pb-4 sm:pb-6`
- **Card/Tile Padding**: `p-5`
- **Grid Gaps**: `gap-4`

### Grid Structure
- Main dashboard uses a 4-column responsive grid:
  `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4`
- Extended items (like leaderboard graph or administration panels) span two columns using `md:col-span-2 xl:col-span-2`.
- Modal splits use a 3-column grid:
  `grid grid-cols-1 lg:grid-cols-3` (1/3 for input control panel, 2/3 for records list).

---

## 4. UI Component Design Patterns

To maintain design language consistency, reuse these styling combinations:

### Forms & Inputs
- **Selects and Text Inputs**:
  ```tsx
  className="w-full bg-[#131416] border border-[#2b2c2f] rounded px-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors text-sm font-mono"
  ```
- **Checkbox Lists**:
  ```tsx
  className="rounded border-[#2b2c2f] bg-[#131416] text-[#4f6272] focus:ring-0 focus:ring-offset-0 cursor-pointer"
  ```
- **Dates**: Always apply `appearance-none` and `box-border` to override browser defaults.

### Buttons & Call-to-Actions
- **Primary Action (Beige Button)**:
  ```tsx
  className="w-full bg-[#c9c7b9] hover:bg-white text-[#1c1d1f] font-bold py-3.5 rounded transition-all text-xs uppercase tracking-widest"
  ```
- **Secondary Actions (Dark Grey Button)**:
  ```tsx
  className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[10px] uppercase font-bold"
  ```
- **Trigger Buttons (Circular navigation/popup arrows)**:
  - Circle sizes: `w-7 h-7` or `w-8 h-8`
  - Scale effects: `hover:scale-105 active:scale-95 transition-all shadow-md`

### Modals & Dialogs
- Overlay wraps screen with dark `bg-black/85 backdrop-blur-sm`.
- Container specifies sizing constraints: `w-full max-w-5xl max-h-[90vh]`.
- Contains absolute close trigger `absolute top-4 right-4` with hover transition.
- Renders animation transitions: `animate-in fade-in zoom-in duration-200`.
