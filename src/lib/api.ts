import { supabase } from '@/integrations/supabase/client'

export async function calculateRecovery(user_id: string, entry_date: string) {
  const { data, error } = await supabase.functions.invoke('calculate-recovery', {
    body: { user_id, entry_date }
  })
  if (error) throw error
  return data
}
