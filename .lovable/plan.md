

## Plan: Add calculateRecovery call after check-in insert

### What changes
**File: `src/pages/app/CheckIn.tsx`** (only file modified)

1. **Add imports** at top:
   - `import { calculateRecovery } from '@/lib/api'`
   - `import { format } from 'date-fns'`

2. **Modify `handleSubmit`** — in the success branch (lines 52-53), replace `onComplete()` with:
   - Wrap in try/catch
   - Call `await calculateRecovery(user.id, format(new Date(), 'yyyy-MM-dd'))`
   - On success → call `onComplete()`
   - On error → `console.error(err)`, show a destructive toast, do NOT call `onComplete()`
   - Move `setLoading(false)` after the try/catch so the button stays disabled during recovery calculation

### No other files modified

