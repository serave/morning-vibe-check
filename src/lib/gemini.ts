import { supabase } from "@/integrations/supabase/client";

export async function analyzeSentiment(text: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke("analyze-sentiment", {
    body: { text },
  });

  if (error) throw new Error(error.message || "Sentiment analysis failed");
  return Math.min(1, Math.max(-1, data.score));
}
