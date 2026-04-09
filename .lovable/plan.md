

## Enhanced Trends Page

**File: `src/pages/app/Trends.tsx`** (only file modified)

### Overview

Replace the entire file with an enhanced version adding time filtering, summary stats, and 4 charts.

### Structure

**State**: `period` ("7D" | "1M" | "3M" | "All", default "1M"), `data`, `loading`

**Data fetch**: On `user` or `period` change, query checkins with a date filter:
- 7D: `entry_date >= today - 7 days`
- 1M: `entry_date >= today - 30 days`
- 3M: `entry_date >= today - 90 days`
- All: no date filter

Select: `entry_date, recovery_score, hrv_rmssd, sleep_hours, soreness, feeling`
Order ascending by entry_date, no limit.

Map rows to: `{ date (formatted M/d), recovery, hrv, sleep, soreness, feeling }`

**Client-side computed fields** added to each data point:
- `recoveryAvg7d`: 7-day rolling average of recovery_score
- `hrvAvg10d`: 10-day rolling average of hrv_rmssd
- `recoveryDotColor`: color based on zone (0-39 red, 40-54 orange, 55-69 yellow, 70-84 green, 85+ blue)
- `sleepColor`: bar fill color (<6h red, 6-7h yellow, >=7h green)

### Layout (top to bottom)

1. **Title**: "Trends"

2. **Period pills**: Row of 4 buttons (7D, 1M, 3M, All). Active pill gets `bg-primary text-white`, inactive gets `bg-muted text-muted-foreground`.

3. **Summary stats** (2×2 grid of small cards):
   - Avg Recovery: `mean(recovery)` displayed as "X%", or "–"
   - Avg Sleep: `mean(sleep)` displayed as "X.Xh", or "–"
   - Avg HRV: `mean(hrv)` displayed as integer, or "–"
   - Days Logged: count of data points

4. **Chart 1 — Recovery Score** (card):
   - LineChart, Y domain [0,100]
   - Solid line for recovery with custom dot renderer coloring each dot by zone
   - Dashed line for `recoveryAvg7d` in `#3F8BFF` with opacity 0.5

5. **Chart 2 — HRV (RMSSD)** (card):
   - LineChart, Y auto domain
   - Solid `#3F8BFF` line for hrv
   - Dashed `#3F8BFF` opacity 0.5 line for `hrvAvg10d`

6. **Chart 3 — Sleep Duration** (card):
   - BarChart, Y domain [0,12]
   - Each bar uses a custom Cell renderer to color by `sleepColor`

7. **Chart 4 — Soreness & Wellbeing** (card):
   - LineChart, Y domain [1,5]
   - Soreness line `#F87171`, Feeling line `#34D399`
   - Legend component below chart

### Imports added

- `BarChart, Bar, Cell, Legend` from recharts
- `subDays` from date-fns

### Technical details

Rolling average helper function:
```typescript
function rollingAvg(arr: number[], i: number, window: number): number | null {
  const slice = arr.slice(Math.max(0, i - window + 1), i + 1).filter(v => v != null);
  return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
}
```

Custom dot renderer for recovery chart to color dots by zone using the same `scoreColor` logic from History.

All existing dark styling preserved (bg-card, tooltip style, grid stroke, axis tick colors).

