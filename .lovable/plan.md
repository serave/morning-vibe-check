

## Fix: Make bottom sheet taller in History.tsx

**File: `src/pages/app/History.tsx`** (only file modified)

### Change

Line 186 — update the sheet container classes:

**Before:**
```
<div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card p-6 shadow-lg animate-in slide-in-from-bottom duration-300">
```

**After:**
```
<div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] min-h-[280px] flex-col rounded-t-2xl bg-card p-6 pb-8 shadow-lg animate-in slide-in-from-bottom duration-300">
```

Key additions:
- `min-h-[280px]` — ensures the sheet is tall enough to show date, score, badge, and buttons
- `max-h-[80vh]` — prevents it from covering the whole screen
- `flex flex-col` — enables flex layout so buttons stay at the bottom
- `pb-8` — extra bottom padding for safe area / breathing room

Then wrap the scrollable content (date/score/badge) in a `<div className="flex-1 overflow-y-auto">` and keep the buttons section outside that scrollable area (in a `<div className="mt-auto pt-4">`) so they're always visible.

### Technical detail

The sheet content will be restructured into two flex children:
1. **Scrollable area** (`flex-1 overflow-y-auto`): close button row, date, score, recommendation badge
2. **Fixed button area** (`mt-auto pt-4`): Edit/Delete buttons or delete confirmation — always visible at bottom

