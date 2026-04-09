

## Fix: Use `location.key` instead of `location.pathname` in Today.tsx

**File: `src/pages/app/Today.tsx`** (only file modified)

**Root cause**: `navigate('/app')` from CheckIn doesn't change `location.pathname` (it's already `/app`), so the useEffect never re-fires. React Router's `location.key` updates on every navigation call, even to the same path.

### Change

In the useEffect dependency array, replace `location.pathname` with `location.key`:

```typescript
useEffect(() => {
  fetchToday();
}, [user, location.key]);
```

One-line change. No other files modified.

