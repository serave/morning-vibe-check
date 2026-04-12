export async function analyzeSentiment(text: string): Promise<number> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_AI_STUDIO}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are analyzing an athlete wellness journal entry for sentiment.
Return ONLY a valid JSON object with exactly one field called "score".
The score must be a number from -1.0 (very negative/unwell) to 1.0 (very positive/great).
No explanation. No markdown. Just the JSON.
Example output: {"score": 0.4}
Text to analyze: "${text}"`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50
        }
      })
    }
  );
  const data = await response.json();
  const raw = data.candidates[0].content.parts[0].text.trim();
  const parsed = JSON.parse(raw);
  return Math.min(1, Math.max(-1, parsed.score));
}
