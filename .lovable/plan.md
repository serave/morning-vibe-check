

## Fix: Bottom sheet position in History.tsx

**File: `src/pages/app/History.tsx`** (only file modified)

### Change

Update the bottom sheet container class from `bottom-0` to `bottom-16` so it sits above the bottom navigation bar.

**Before:**
```
<div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] min-h-[280px] flex-col rounded-t-2xl bg-card p-6 pb-8 shadow-lg animate-in slide-in-from-bottom duration-300">
```

**After:**
```
<div className="fixed inset-x-0 bottom-16 z-50 flex max-h-[80vh] min-h-[280px] flex-col rounded-t-2xl bg-card p-6 pb-8 shadow-lg animate-in slide-in-from-bottom duration-300">
```

One class change. No other modifications.

