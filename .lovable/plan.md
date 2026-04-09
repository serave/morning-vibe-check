

## Fix: Replace `onComplete` with `navigate('/app')` in CheckIn.tsx

**File: `src/pages/app/CheckIn.tsx`**

`onComplete` currently calls `fetchToday()` in the parent (Today.tsx), which re-queries the database. This may not find the new record if the edge function hasn't finished writing back. Replacing with a full route navigation forces a fresh mount of Today.tsx.

### Changes

1. **Add import**: `import { useNavigate } from "react-router-dom";`
2. **Remove** the `onComplete` prop and `CheckInProps` interface entirely
3. **Add** `const navigate = useNavigate();` inside the component
4. **Replace** `onComplete()` (after calculateRecovery success) with `navigate('/app')`
5. Remove `onComplete` from function signature

Wait — the user said "Do not modify any other files", but Today.tsx passes `onComplete` as a prop. If I remove the prop from CheckIn, Today.tsx will have a type error passing it.

**Revised approach** — minimal change, keep the prop interface:

1. **Add import**: `import { useNavigate } from "react-router-dom";`
2. **Add** `const navigate = useNavigate();` at top of component body
3. **Replace** `onComplete()` on success with `navigate('/app')`

The `onComplete` prop stays in the interface (unused but harmless), so Today.tsx doesn't break.

### No other files modified

