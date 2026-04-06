

## Problem
The `@import` statement on line 5 of `src/index.css` must come before all `@tailwind` directives. CSS spec requires `@import` to precede all other statements.

## Fix
Move the `@import url(...)` line to line 1, before the `@tailwind` directives.

**File: `src/index.css`**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* ... rest unchanged */
```

This is a one-line move — no other changes needed.

