## Add Apple-style daily activity ring (Steps, Active Energy, Stand Hours)

Extend the existing HealthKit sync to capture daily activity metrics and surface them on Today's screen as an Apple-style triple ring.

### Backend / sync

**`src/lib/health.ts`**
- Add to `READ_PERMISSIONS`: `stepCount`, `activeEnergyBurned`, `appleStandTime` (or `appleStandHour`).
- Extend `HealthSampleType` with: `steps`, `active_energy_kcal`, `stand_hours`.
- In `syncHealthData`, query each type and aggregate per day:
  - **Steps** → sum of `quantity` per day.
  - **Active energy** → sum of kcal per day.
  - **Stand hours** → count of distinct hours with a stand event (HealthKit's `appleStandHour` is a category sample; sum of qualifying hours).
- Add a small `sumByDay` helper alongside the existing `avgByDay`.
- Extend `TodayHealth` interface and `getTodayHealth` mapping with the three new fields.
- Also fetch user's daily goals from `profiles` (new columns, see below) with sensible defaults (steps 10000, active_energy 500 kcal, stand 12 h).

### Database

**New migration** — add user-configurable ring goals to `profiles`:
- `steps_goal int default 10000`
- `active_energy_goal int default 500`
- `stand_goal int default 12`

No new tables needed — values flow through existing `health_samples` (`sample_type` text column, no enum constraint).

### UI

**New component `src/components/ActivityRings.tsx`**
- SVG triple concentric ring (Move = red/orange, Exercise/Energy = green, Stand = blue) — but mapped to **Steps / Active Energy / Stand Hours** as requested.
- Props: `{ steps, stepsGoal, activeKcal, activeGoal, standHours, standGoal }`.
- Each ring is an SVG circle with `strokeDasharray` driven by `min(value/goal, 1)`; overflow past 100% draws a second lap with reduced opacity.
- Uses semantic color tokens from `index.css` (add ring color tokens `--ring-move`, `--ring-energy`, `--ring-stand` in HSL).

**`src/pages/app/Today.tsx`**
- After loading user, fetch today's health via `getTodayHealth(user.id)` and profile goals.
- Render an `ActivityRings` card above the check-in / results, showing the three rings plus numeric labels (e.g. `7,432 / 10,000 steps`).

**Optional: `src/pages/app/AppSettings.tsx`**
- Add three numeric inputs to edit `steps_goal`, `active_energy_goal`, `stand_goal` on the profile.

### Out of scope
- No Health Connect (Android) wiring — current code only supports HealthKit; matches existing pattern.
- No historical ring chart on Trends — can be a follow-up.

### Files touched
- new: `supabase/migrations/<timestamp>_activity_goals.sql`
- new: `src/components/ActivityRings.tsx`
- edit: `src/lib/health.ts`
- edit: `src/pages/app/Today.tsx`
- edit: `src/pages/app/AppSettings.tsx` (goal inputs)
- edit: `src/index.css` (ring color tokens)
