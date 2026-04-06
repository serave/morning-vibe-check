

## Plan: New Database Schema Migration

### What changes
A single new migration that drops the existing `checkins` and `profiles` tables and recreates them with your new schema, plus adds a new `baseline_cache` table.

### Key differences from current schema
- `profiles.id` becomes the primary key referencing `auth.users(id)` directly (no separate `user_id` column)
- `profiles` gains `timezone`, `sport_type`, `streak_count`, `longest_streak` columns; drops `updated_at`
- `checkins` is completely redesigned with HRV, feeling, training fields, scoring columns, and metadata
- New `baseline_cache` table for computed baselines
- RLS uses single `FOR ALL` policies instead of per-operation policies
- `handle_new_user()` updated to match new `profiles` schema (inserts into `id` column directly)

### Migration SQL summary
1. Drop existing triggers on `profiles` and `checkins`
2. Drop trigger `on_auth_user_created` on `auth.users`
3. Drop existing RLS policies on both tables
4. Drop `checkins` then `profiles` (order matters due to no FK dependency currently, but safe)
5. Create new `profiles`, `checkins`, `baseline_cache` tables with your exact schema
6. Enable RLS on all three tables
7. Create `FOR ALL` policies
8. Replace `handle_new_user()` function and recreate the auth trigger
9. Add `updated_at` trigger on `checkins`

### Technical note
The CHECK constraints (`soreness between 1 and 5`, etc.) are simple range validations and will be kept as-is since they are immutable expressions (no time-based logic).

### Files changed
- New migration SQL file only — no React components touched

