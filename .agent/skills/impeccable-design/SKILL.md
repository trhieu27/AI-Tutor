---
name: impeccable-design
description: >
  Activate when the user asks to improve, redesign, polish, audit, or modernize
  any UI component, page, or CSS in the AI Tutor frontend. Also triggers on
  commands like /polish, /audit, /typeset, /colorize, /animate, /layout,
  /bolder, /quieter, /delight. Teaches the AI real design vocabulary and
  enforces 2025 modern web standards. Prevents AI slop anti-patterns.
user-invocable: true
allowed-tools:
  - view_file
  - replace_file_content
  - multi_replace_file_content
  - write_to_file
  - run_command
  - grep_search
  - list_dir
---

# Impeccable Design Skill — AI Tutor Frontend

## Project Context (always load first)

**Stack**: Vite + React + TailwindCSS v4 + vanilla CSS design system  
**Design tokens file**: `src/app/globals.css`  
**Primary color**: `hsl(239 68% 58%)` (indigo-violet brand)  
**Font**: Inter (body/headings), JetBrains Mono (code), Material Symbols Outlined (icons)  
**Theme**: Light + Dark via `.dark` class + CSS custom properties (`var(--...)`)  
**Mode**: PRODUCT mode (design SERVES the product — app UI, dashboard, tools)  

Before any design command runs, always:
1. Read `src/app/globals.css` to understand current design tokens
2. Read the target component file to understand existing structure
3. Never invent new design systems — evolve what's already there

---

## Shared Design Laws (enforce on every output)

### Typography
- Use **Inter** for all UI text — never swap to serif for body/UI copy
- Display headings: `font-weight: 800`, `letter-spacing: -0.03em`, `line-height: 1.05`
- Body text: `font-weight: 450–500`, `letter-spacing: -0.01em`, `line-height: 1.6`
- Labels/captions: `font-weight: 600`, ALL CAPS, `letter-spacing: 0.08em`, `font-size: 10–11px`
- **Never** set `font-size` below 11px on visible text
- **Never** use `font-weight: 300` or lighter for body — too thin on dark backgrounds

### Color
- All colors via CSS custom properties: `var(--background)`, `var(--foreground)`, etc.
- Accent colors via HSL format: `hsl(239 68% 58%)` — never hex for brand colors
- Interactive elements need **3 states**: default, hover, active/pressed
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text
- Shadows use `hsl()` with alpha: `hsl(239 68% 58% / 0.25)` — never `rgba()`

### Spacing
- Base unit: 4px (`0.25rem`). All spacing is multiples of 4
- Component padding: minimum `12px` (3 units) horizontally, `8px` (2 units) vertically
- Section gaps: `24px`, `32px`, `48px`, `64px`, `96px`
- Never use odd spacing values like `13px`, `17px`, `22px`

### Borders & Radius
- Cards: `border-radius: 16px` (rounded-2xl) minimum
- Inputs: `border-radius: 12px` (rounded-xl)
- Pills/badges: `border-radius: 999px`
- Buttons: `border-radius: 12px` for standard, `border-radius: 16px` for large CTA
- **Never** mix radius styles within a single component

### Motion
- Default transition: `150ms ease` for color/opacity, `200ms cubic-bezier(0.34, 1.56, 0.64, 1)` for transforms
- Hover scale: `scale(1.02)` for cards, `scale(1.05)` for icons — never more
- Enter animations: `opacity 0→1` + `translateY(8px→0)` at `300–400ms`
- **Never** animate `width`, `height`, or `max-height` directly — use `transform` + `opacity`

### Interaction
- Every clickable element needs `:hover` + `:active` + `:focus-visible` styles
- Focus rings: `outline: 2px solid hsl(239 68% 58% / 0.6)`, `outline-offset: 2px`
- Loading states: skeleton shimmer or spinner — never blank/empty
- Disabled: `opacity: 0.5`, `cursor: not-allowed`, no hover effects

---

## Anti-Pattern Blocklist (never produce these)

These are AI slop fingerprints — always avoid:

| Anti-Pattern | Why it's wrong | Fix |
|---|---|---|
| Purple/violet gradient everywhere | Generic AI-generated look | Use gradient only for brand accent, sparingly |
| Gradient text on headings | Overused, hard to read | Use solid color or single subtle accent |
| `Inter` font + pill badge + gradient button combo | Clone look | Vary badge shapes, use flat or outlined buttons |
| Nested cards (card inside card inside card) | Visual noise, no hierarchy | Flatten to surface + section separator |
| Glassmorphism on everything | Loses focus, performance hit | Glass only on floating panels (modals, dropdowns) |
| `text-transform: uppercase` on body text | Reduces readability | Only on 10–11px labels |
| Thick 2–4px colored left border on cards | Side-tab anti-pattern | Use full card tint or icon accent instead |
| Generic hero with gradient orb + floating cards | Template look | Use content-specific imagery or data |
| `backdrop-filter` on non-floating elements | Layout reflow, performance | Only for modals, headers, tooltips |
| Empty states with just text + icon | Lazy | Add clear CTA and illustration context |
| `box-shadow` with pure black: `rgba(0,0,0,0.x)` | Muddy, flat | Use colored shadows: `hsl(239 68% 58% / 0.2)` |
| Overused fonts: Plus Jakarta Sans, Space Grotesk, Fraunces | Monoculture | Stick to Inter for product UI |
| Italic serif h1 hero | Late-2025 AI cliché | Use Inter bold or weighted sans |
| Hero eyebrow chip (uppercase pill above h1) | Overused pattern | Use inline badge or remove entirely |

---

## Commands Router

When the user types any of these commands, load the corresponding behavior:

### `/polish` or "polish this"
**Goal**: Make the existing UI more refined without structural changes
1. Check spacing consistency (4px grid)
2. Audit hover/focus states on all interactive elements
3. Improve typography hierarchy (size steps, weight contrast)
4. Ensure color token usage (no hardcoded hex)
5. Add micro-animations on hover if missing
6. Check dark mode contrast

### `/audit` or "audit this"
**Goal**: Report design issues, don't fix yet
1. List all anti-patterns found (use Anti-Pattern Blocklist above)
2. Check color contrast on text elements
3. Identify inconsistent spacing
4. Flag hardcoded colors vs. CSS custom properties
5. Note missing interactive states
6. Output as a prioritized list: 🔴 Critical → 🟡 Warning → 🔵 Suggestion

### `/typeset` or "fix typography"
**Goal**: Apply typographic best practices
1. Establish clear scale: display → heading → subheading → body → caption
2. Fix `letter-spacing` per level (headings: `-0.02em`, body: `-0.01em`, labels: `+0.08em`)
3. Adjust `line-height` (headings: `1.1–1.2`, body: `1.5–1.7`)
4. Ensure weight contrast between levels (never two adjacent levels at same weight)
5. Remove any serif fonts from product UI (keep Inter)

### `/colorize` or "fix colors"
**Goal**: Improve color system usage
1. Replace all hardcoded hex/rgb with CSS custom properties
2. Ensure semantic color usage (`var(--foreground)` not `var(--brand-500)` for body text)
3. Add proper alpha variants for overlays
4. Verify 4.5:1 contrast on all text
5. Apply colored shadows to primary CTA buttons

### `/animate` or "add animations"
**Goal**: Add tasteful motion without overdoing it
1. Add `transition` to all interactive elements (color, bg, transform)
2. Add enter animations for dynamic content (cards, modals, dropdowns)
3. Add hover lift effect to cards (`translateY(-2px)` + shadow increase)
4. Add icon scale on parent hover (`group-hover:scale-110`)
5. Add loading shimmer to skeleton states

### `/layout` or "fix layout"
**Goal**: Improve spatial structure and visual hierarchy
1. Check if content respects 4px grid
2. Identify sections that need more breathing room
3. Suggest bento grid or column rebalancing for dense pages
4. Ensure responsive breakpoints: 375px → 768px → 1280px → 1536px
5. Fix any overflow or clipping issues

### `/bolder` or "make it bolder"
**Goal**: Increase visual confidence and contrast
1. Increase heading `font-weight` (700 → 800)
2. Increase heading size by one step
3. Tighten `letter-spacing` on headings (→ `-0.03em`)
4. Add more white space around key elements
5. Increase shadow depth on primary components

### `/quieter` or "make it quieter / subtler"
**Goal**: Reduce visual noise, add refinement
1. Reduce shadow intensity by 40%
2. Lighten border colors by using `/0.5` alpha
3. Reduce icon sizes by 2px
4. Increase body text line-height
5. Remove decorative elements that don't carry meaning

### `/delight` or "add delight"
**Goal**: Add premium micro-interactions and personality
1. Add hover glow to primary CTA button
2. Add icon rotation/bounce on nav item hover
3. Add stagger animation to lists (each item 50ms delay)
4. Add a subtle gradient shimmer to empty states
5. Add focus ring glow animation

### `/impeccable teach` or "set up design context"
**Goal**: Create DESIGN.md for this project
1. Read `src/app/globals.css` for all design tokens
2. Read `src/components/Sidebar.jsx`, `Header.jsx`, and `(dashboard)/page.jsx`
3. Generate `DESIGN.md` at project root with:
   - Color palette with hex+HSL values
   - Typography scale
   - Component inventory
   - Do's and Don'ts
   - Anti-patterns specific to this codebase

---

## Quality Gate (run before completing any design task)

Before marking done, verify:
- [ ] No hardcoded hex colors — only `var(--...)` or `hsl()` tokens
- [ ] All interactive elements have hover + focus-visible states
- [ ] Dark mode tested: check `.dark` class token overrides
- [ ] No anti-patterns from the blocklist above
- [ ] Spacing follows 4px grid
- [ ] No inline styles unless dynamic (JS-computed values)
- [ ] Animations use `transform` + `opacity` only (no layout-triggering props)
- [ ] Existing JSX logic/state/handlers preserved unchanged

---

## Output Format

When making changes:
1. State which design law or command is being applied
2. List any anti-patterns being fixed
3. Show the updated file (complete, not partial diff)
4. Note any design decisions made and why

When auditing:
1. Use emoji severity: 🔴 Critical, 🟡 Warning, 🔵 Suggestion
2. Quote the specific line or class causing the issue
3. Provide the fix, not just the problem
