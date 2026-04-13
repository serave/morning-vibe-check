import { supabase } from "@/integrations/supabase/client";

export const PRESET_TAGS = [
  { name: 'Sick', color: '#F87171' },
  { name: 'Overexerted', color: '#FB923C' },
  { name: 'Poor sleep', color: '#FBBF24' },
  { name: 'Dehydrated', color: '#60A5FA' },
  { name: 'Stressed', color: '#C084FC' },
  { name: 'Jet lagged', color: '#94A3B8' },
  { name: 'Alcohol last night', color: '#F472B6' },
  { name: 'Race day', color: '#34D399' },
  { name: 'Competition', color: '#34D399' },
  { name: 'Well rested', color: '#34D399' },
  { name: 'Feeling sharp', color: '#3F8BFF' },
  { name: 'Motivated', color: '#3F8BFF' },
  { name: 'Deload week', color: '#94A3B8' },
  { name: 'Back-to-back days', color: '#FB923C' },
  { name: 'High stress', color: '#F87171' },
];

export async function seedPresetTags(user_id: string) {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', user_id)
    .limit(1);

  if (existing && existing.length > 0) return; // already seeded

  await supabase.from('tags').insert(
    PRESET_TAGS.map(tag => ({
      user_id,
      name: tag.name,
      color: tag.color,
      is_preset: true,
    }))
  );
}