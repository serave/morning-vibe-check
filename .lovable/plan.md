

## Plan: Fix infinite loop in CheckIn.tsx useEffect

**Problem:** The `useEffect` calls `onComplete()` which triggers a parent re-render, re-mounting CheckIn, re-running the effect → infinite loop.

**Fix:** In the `useEffect` (around lines 44-54 of `src/pages/app/CheckIn.tsx`), replace `onComplete()` with `navigate("/app", { replace: true })` when an existing check-in is found.

**Change:** One line change inside the `.then()` callback:
- Before: `if (data) onComplete();`
- After: `if (data) navigate("/app", { replace: true });`

`handleSubmit` remains unchanged — it still calls `onComplete()` at the end. No other files modified.

