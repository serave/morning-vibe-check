

## Fix: Remove `notes` from checkins select in Today.tsx

**File: `src/pages/app/Today.tsx`** (only file modified)

**Root cause**: The select string on line 24 includes `notes`, but the `checkins` table has no `notes` column. This causes a 400 error (`column checkins.notes does not exist`). Note: `hrv_deviation` is not currently in the select string — the actual offending column is `notes`.

### Change

Line 24: Remove `notes` from the select string.

Before:
```
"entry_date, sleep_hours, soreness, feeling, recovery_score, training_recommendation, sleep_score, soreness_score, wellbeing_score, hrv_score, lowest_factor, baseline_phase, notes"
```

After:
```
"entry_date, sleep_hours, soreness, feeling, recovery_score, training_recommendation, sleep_score, soreness_score, wellbeing_score, hrv_score, lowest_factor, baseline_phase"
```

Also need to confirm Results.tsx references to `notes` won't break — they'll just receive `undefined`/`null` which the conditional rendering already handles gracefully.

### No other files modified

