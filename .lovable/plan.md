

## Add console.log statements to CheckIn.tsx

Four `console.log` calls inserted into `handleSubmit`, no other changes:

1. **Line 38** (before the insert): Add `console.log('Starting submit', { userId: user?.id })`
2. **Line 55** (after insert succeeds, before try): Add `console.log('Insert success, calling calculateRecovery')`
3. **Line 56–57** (before calculateRecovery): Add `const entryDate = format(new Date(), "yyyy-MM-dd");` and `console.log('Calling calculateRecovery with:', { userId: user?.id, entryDate })`, then use `entryDate` in the call
4. **Line 57** (after calculateRecovery resolves): Add `console.log('calculateRecovery success')` right before `onComplete()`

### Resulting handleSubmit

```typescript
const handleSubmit = async () => {
  if (!user) return;
  setLoading(true);
  console.log('Starting submit', { userId: user?.id });
  const { error } = await supabase.from("checkins").insert({ ... });
  if (error) { ... return; }
  console.log('Insert success, calling calculateRecovery');
  try {
    const entryDate = format(new Date(), "yyyy-MM-dd");
    console.log('Calling calculateRecovery with:', { userId: user?.id, entryDate });
    await calculateRecovery(user.id, entryDate);
    console.log('calculateRecovery success');
    onComplete();
  } catch (err) { ... }
};
```

Only `src/pages/app/CheckIn.tsx` is modified.

