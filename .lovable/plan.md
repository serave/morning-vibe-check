

## Plan: Update CheckIn.tsx with duplicate-check and navigation fix

Two targeted changes to `src/pages/app/CheckIn.tsx`:

1. **Add useEffect** after the useState block (~line 41) to check for an existing check-in on mount. If one exists for today, call `onComplete()` immediately to skip the form.

2. **Replace `navigate("/app")`** at the end of `handleSubmit` (~line 97) with `onComplete()` so the parent refetches and shows Results without a full navigation.

No other files modified. The `useEffect` import already exists via React, and `format` + `supabase` are already imported.

