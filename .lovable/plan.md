

## Three fixes to CheckIn.tsx

### 1. HRV warning — show only after typing, new thresholds & message
- Change warning condition: show when `hrvRmssd !== ""` (user has typed) AND value is `< 10` or `> 200`
- Update message text to: "⚠️ Typical RMSSD is between 10–200 ms. Double-check your device."

### 2. Hide number input spinners
- Add a `<style>` block (via inline JSX) at the top of the returned JSX to hide webkit spinner arrows and set `-moz-appearance: textfield` for all `input[type=number]` within the component. This avoids touching any other file.

### 3. Disable submit until HRV > 0, soreness touched, feeling touched
- Add two new state booleans: `sorenessSet` (default `false`) and `feelingSet` (default `false`)
- Wrap `setSoreness` and `setFeeling` callbacks so they also flip the corresponding boolean to `true` on first interaction
- Disable the submit button when: `loading || !hrvValue || hrvValue <= 0 || !sorenessSet || !feelingSet`

### Files modified
- `src/pages/app/CheckIn.tsx` — all three changes above
- No other files touched

