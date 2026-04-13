const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const model = 'google/gemini-3-flash-preview'

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

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You analyze athlete wellness journal entries and assign a sentiment score from -1.0 (very negative/unwell) to 1.0 (very positive/great). Always call the provided tool with only the score.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_sentiment_score',
              description: 'Return the sentiment score for the athlete journal entry.',
              parameters: {
                type: 'object',
                properties: {
                  score: {
                    type: 'number',
                    minimum: -1,
                    maximum: 1,
                  },
                },
                required: ['score'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: {
            name: 'return_sentiment_score',
          },
        },
      }),
    })

    if (!aiRes.ok) {
      const errBody = await aiRes.text()
      const status = aiRes.status === 402 || aiRes.status === 429 ? aiRes.status : 502
      console.error('AI gateway error:', aiRes.status, errBody)
      return new Response(
        JSON.stringify({
          error:
            aiRes.status === 402
              ? 'AI credits exhausted. Please add funds to your workspace AI balance and try again.'
              : aiRes.status === 429
                ? 'AI rate limit reached. Please wait a moment and try again.'
                : `AI gateway error (${aiRes.status}): ${errBody}`,
        }),
        {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await aiRes.json()
    const toolArgs = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
    if (!toolArgs) {
      console.error('Unexpected AI gateway response:', JSON.stringify(data))
      return new Response(JSON.stringify({ error: 'Invalid response from AI' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = JSON.parse(toolArgs)
    if (typeof parsed.score !== 'number' || Number.isNaN(parsed.score)) {
      return new Response(JSON.stringify({ error: 'Invalid response from AI' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
