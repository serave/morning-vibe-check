

## Plan: Fix useEffect with cleanup flag and empty deps

**File:** `src/pages/app/CheckIn.tsx`

**Change:** Replace lines 44-56 with the user's exact code — adds a cleanup flag (`active`) to prevent stale calls and changes the dependency array from `[user]` to `[]`.

```typescript
useEffect(() => {
  if (!user) return;
  let active = true;
  const today = format(new Date(), "yyyy-MM-dd");
  supabase
    .from("checkins")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", today)
    .maybeSingle()
    .then(({ data }) => {
      if (active && data) onComplete();
    });
  return () => { active = false; };
}, []);
```

No other files modified.

