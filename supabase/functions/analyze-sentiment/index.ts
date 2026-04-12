import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "text" field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_AI_STUDIO')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_AI_STUDIO secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
          generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
        }),
      }
    )

    const data = await geminiRes.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!raw) {
      console.error('Unexpected Gemini response:', JSON.stringify(data))
      return new Response(JSON.stringify({ error: 'Invalid response from AI' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = JSON.parse(raw)
    const score = Math.min(1, Math.max(-1, parsed.score))

    return new Response(JSON.stringify({ score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('analyze-sentiment error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
