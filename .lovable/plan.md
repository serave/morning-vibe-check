## Goal
Add a standalone Privacy Policy page at `/privacy` using the user's provided content and the same dark-themed styling as the existing Terms and Conditions page.

## Changes

### 1. New file: `src/pages/PrivacyPolicy.tsx`
- Mirror the `TermsAndConditions.tsx` component structure: `Section` helper, `bg-background` wrapper, `bg-card` content card.
- Use app name **Morning Vibe Check** and website **https://morning-vibe-check.lovable.app**.
- Omit email contact (per user request).
- Include all 11 sections from the user's Privacy Policy template.
- Add a "Back" link to `/login`.

### 2. Update: `src/App.tsx`
- Import `PrivacyPolicy`.
- Add `<Route path="/privacy" element={<PrivacyPolicy />} />` alongside the existing `/terms` route (outside the protected layout).

## No backend or dependency changes required.