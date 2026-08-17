---
name: taste
description: Use when designing or redesigning frontend UI/UX. Applies Taste design methodology — typography, spacing, color, layout, and motion. Use for component design, page layouts, design systems, and visual consistency audits.
---

# Taste Design Skill

## Philosophy

Taste is a design methodology focused on five pillars applied in strict order:

1. **Typography** — Font choice and scale establish the visual voice
2. **Spacing** — Consistent rhythm creates visual hierarchy without borders
3. **Color** — Restrained palette; use color only to draw attention
4. **Layout** — Clear information architecture, generous whitespace
5. **Motion** — Subtle, purposeful transitions; never decorative

## Principles

- **Typography first**: Choose one font. Define a clear scale. Use weight, not size, for hierarchy.
- **Less is more**: Remove elements before adding them. Every UI element must justify its existence.
- **Color sparingly**: One brand color. One accent. Neutrals for everything else. Semantic colors only for states.
- **Spacing over lines**: Use whitespace to separate sections instead of borders and dividers.
- **Flat but not sterile**: Subtle shadows (0-2px blur, low opacity) for cards and elevated surfaces.
- **No gradients**: Solid colors only. Gradients date quickly and reduce readability.
- **No excessive cards**: Cards should contain a single coherent piece of information. Avoid card-in-card nesting.
- **Motion for feedback**: 150ms ease transitions on interactive elements. No page transitions. No decorative animations.

## Design Tokens Pattern

All design decisions should be expressed as CSS custom properties:

```css
:root {
  /* Colors */
  --color-primary: #1e40af;
  --color-primary-hover: #1e3a8a;
  --color-primary-light: #eff6ff;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-base: 0.875rem;
  --text-lg: 1rem;
  --text-xl: 1.125rem;
  --text-2xl: 1.25rem;
  --text-3xl: 1.5rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-lg: 0 2px 8px rgba(0,0,0,0.06);

  /* Borders */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  /* Motion */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}
```

## Page Templates

### List Page Pattern
```
┌──────────────────────────────────────────┐
│ PageHeader (title + breadcrumb + action) │
├──────────────────────────────────────────┤
│ Filter bar (inline form, subtle bg)      │
├──────────────────────────────────────────┤
│ Summary row (2-4 stat cards, outlined)   │
├──────────────────────────────────────────┤
│ Data table (zebra-striped, hover)        │
├──────────────────────────────────────────┤
│ Pagination (centered, clean)             │
└──────────────────────────────────────────┘
```

### Detail Page Pattern
```
┌──────────────────────────────────────────┐
│ PageHeader (title + breadcrumb + actions)│
├──────────────────────────────────────────┤
│ Summary card (key metrics at a glance)   │
├──────────────────────────────────────────┤
│ Tab navigation (timeline/details/etc)    │
├──────────────────────────────────────────┤
│ Tab content (2-col grid → stacked)       │
└──────────────────────────────────────────┘
```

## Pre-flight Checklist

After implementing a design, verify:

1. [ ] All text uses the designated font family
2. [ ] Heading hierarchy is consistent (h1 → h2 → h3, no skips)
3. [ ] Spacing follows the scale (no magic numbers)
4. [ ] Color usage follows the palette (no off-brand colors)
5. [ ] No gradients present
6. [ ] No unnecessary animations
7. [ ] Cards are not nested inside other cards
8. [ ] Empty states have clear messaging with an icon
9. [ ] Interactive elements have hover/active states
10. [ ] Mobile layout is usable at 375px width
11. [ ] Status badges use consistent color mapping
12. [ ] Tables are horizontally scrollable on narrow screens
