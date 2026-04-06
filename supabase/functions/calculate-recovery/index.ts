import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)) }

function sleepRaw(h: number): number {
  if (h >= 8.0 && h <= 9.5) return 100
  if (h >= 7.0 && h < 8.0) return 70 + ((h - 7) / 1) * 30
  if (h >= 6.0 && h < 7.0) return 40 + ((h - 6) / 1) * 30
  if (h >= 5.0 && h < 6.0) return 20 + ((h - 5) / 1) * 20
  if (h > 9.5 && h <= 11.0) return 100 - ((h - 9.5) / 1.5) * 20
  if (h < 5.0) return Math.max(0, h * 4)
  return 80
}

function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length }
function std(arr: number[], m: number) {
  return Math.sqrt(arr.map(v => (v - m) ** 2).reduce((a, b) => a + b, 0) / arr.length)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id, entry_date } = await req.json()

    const { data: allEntries } = await supabase
      .from('checkins')
      .select('hrv_rmssd, sleep_hours, entry_date')
      .eq('user_id', user_id)
      .order('entry_date', { ascending: false })
      .limit(61)

    const { data: todayRow } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user_id)
      .eq('entry_date', entry_date)
      .single()

    if (!todayRow) throw new Error('Check-in entry not found')

    const { hrv_rmssd, sleep_hours, soreness, feeling } = todayRow
    const totalEntries = allEntries?.length ?? 0
    const historicalEntries = allEntries?.filter(e => e.entry_date !== entry_date) ?? []

    const baselinePhase = totalEntries < 7 ? 'ONBOARDING' : totalEntries < 14 ? 'EARLY' : 'ACTIVE'
    const hrvWeight = baselinePhase === 'ACTIVE' ? 0.40 : 0.25

    const lnToday = Math.log(hrv_rmssd)
    const lnValues = historicalEntries
      .filter(e => e.hrv_rmssd && e.hrv_rmssd > 0)
      .slice(0, 60)
      .map(e => Math.log(e.hrv_rmssd))

    let hrvScore = 50
    let hrvDeviation = 0
    if (lnValues.length >= 3) {
      const m = mean(lnValues)
      const s = std(lnValues, m)
      if (s > 0) {
        const z = (lnToday - m) / s
        hrvScore = clamp(50 + z * 15, 0, 100)
        hrvDeviation = z
      }
    }

    const sleepValues = historicalEntries
      .filter(e => e.sleep_hours && e.sleep_hours > 0)
      .slice(0, 30)
      .map(e => e.sleep_hours)

    let sleepScore = sleepRaw(sleep_hours)
    if (sleepValues.length >= 3) {
      const sm = mean(sleepValues)
      const ss = std(sleepValues, sm)
      if (ss > 0) {
        const zs = (sleep_hours - sm) / ss
        sleepScore = clamp(sleepRaw(sleep_hours) + clamp(zs * 5, -15, 15), 0, 100)
      }
    }

    const sorenessScore = clamp((6 - soreness) * 25, 0, 100)
    const wellbeingScore = (feeling - 1) * 25

    const totalWeight = hrvWeight + 0.30 + 0.20 + 0.10
    const rawComposite = hrvScore * hrvWeight + sleepScore * 0.30 +
      wellbeingScore * 0.20 + sorenessScore * 0.10
    const recoveryScore = clamp(rawComposite / totalWeight, 0, 100)

    const factors = [
      { label: 'HRV', score: hrvScore },
      { label: 'sleep duration', score: sleepScore },
      { label: 'how you were feeling', score: wellbeingScore },
      { label: 'muscle soreness', score: sorenessScore }
    ]
    const lowestFactor = [...factors].sort((a, b) => a.score - b.score)[0]

    let recommendation: string
    if (feeling === 1) {
      recommendation = 'REST'
    } else if (recoveryScore >= 85) {
      recommendation = 'GO_HARD'
    } else if (recoveryScore >= 70) {
      recommendation = 'NORMAL'
    } else if (recoveryScore >= 55) {
      recommendation = 'ENDURANCE'
    } else if (recoveryScore >= 40) {
      recommendation = 'EASY'
    } else {
      recommendation = 'REST'
    }

    const yesterday = new Date(entry_date)
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]

    const { data: prevEntry } = await supabase.from('checkins')
      .select('entry_date').eq('user_id', user_id).eq('entry_date', yStr).single()

    const { data: profile } = await supabase.from('profiles')
      .select('streak_count, longest_streak').eq('id', user_id).single()

    const newStreak = prevEntry ? (profile?.streak_count ?? 0) + 1 : 1
    const longestStreak = Math.max(newStreak, profile?.longest_streak ?? 0)

    await supabase.from('profiles')
      .update({ streak_count: newStreak, longest_streak: longestStreak })
      .eq('id', user_id)

    const lnArr = [lnToday, ...lnValues].slice(0, 60)
    const sleepArr = [sleep_hours, ...sleepValues].slice(0, 30)
    const m60 = lnArr.length > 0 ? mean(lnArr) : null
    const s60 = lnArr.length > 1 ? std(lnArr, m60!) : null
    const sm30 = sleepArr.length > 0 ? mean(sleepArr) : null

    await supabase.from('checkins').update({
      sleep_score: Math.round(sleepScore),
      soreness_score: sorenessScore,
      wellbeing_score: wellbeingScore,
      recovery_score: Math.round(recoveryScore * 10) / 10,
      training_recommendation: recommendation,
      baseline_phase: baselinePhase,
      hrv_weight_applied: hrvWeight,
      lowest_factor: lowestFactor.label,
      updated_at: new Date().toISOString()
    }).eq('id', todayRow.id)

    await supabase.from('baseline_cache').upsert({
      user_id,
      hrv_60d_mean_ln: m60,
      hrv_60d_std_ln: s60,
      sleep_30d_mean: sm30,
      total_entries: totalEntries,
      baseline_phase: baselinePhase,
      computed_at: new Date().toISOString()
    })

    return new Response(JSON.stringify({
      hrv_score: Math.round(hrvScore),
      sleep_score: Math.round(sleepScore),
      soreness_score: sorenessScore,
      wellbeing_score: wellbeingScore,
      recovery_score: Math.round(recoveryScore * 10) / 10,
      training_recommendation: recommendation,
      baseline_phase: baselinePhase,
      hrv_weight_applied: hrvWeight,
      lowest_factor: lowestFactor.label,
      hrv_deviation: Math.round(hrvDeviation * 100) / 100,
      streak: newStreak
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
