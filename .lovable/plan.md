

## Fix: Force re-fetch on navigation in Today.tsx

**File: `src/pages/app/Today.tsx`** (only file modified)

### Changes

1. **Add import**: `useLocation` from `react-router-dom`
2. **Add hook**: `const location = useLocation();` inside component
3. **Update useEffect deps**: Change `[user]` to `[user, location.pathname]`
4. **Reset loading on re-fetch**: Set `setLoading(true)` at the start of `fetchToday()` so the spinner shows while re-querying after navigation

This ensures that when `navigate('/app')` is called from CheckIn, the route change triggers the useEffect to re-run `fetchToday()`, which will now find the newly inserted checkin record and render Results.

No `refreshKey` state is needed — the `location.pathname` dependency achieves the same goal more cleanly.

### No other files modified

