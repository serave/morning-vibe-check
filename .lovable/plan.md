Build a Terms and Conditions page for Morning Vibe Check.

## What to build
- A new `/terms` route and a `TermsAndConditions` page component.
- Content uses the provided T&C template with blanks filled in:
  - App name: **Morning Vibe Check**
  - Website: **https://morning-vibe-check.lovable.app**
  - Email/contact section removed per user request.

## How to build
- Page: `src/pages/TermsAndConditions.tsx`
  - Dark-themed, centered content card matching app aesthetic (`bg-card`, `text-foreground`, Inter font).
  - Sections rendered as styled headings + paragraphs with clear typography hierarchy.
  - "Last Updated: May 2026" header.
  - Back navigation link.
- Routing: Add `/terms` route in `src/App.tsx` (outside protected app layout).
- Links: Add "Terms and Conditions" link on Register page (and optionally Login footer) so users can access it during signup.

## Notes
- No backend changes required.
- No new dependencies required.