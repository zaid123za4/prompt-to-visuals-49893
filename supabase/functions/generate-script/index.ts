import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, duration = 30 } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const stylePrompts = {
      cinematic: 'Create a dramatic, cinematic video script with epic visuals and professional narration.',
      anime: 'Create an anime-style video script with vibrant visuals and energetic narration.',
      vlog: 'Create a casual, personal vlog-style script with authentic and conversational narration.',
      realistic: 'Create a realistic documentary-style script with natural visuals and informative narration.',
      advertisement: 'Create a compelling advertisement script with attention-grabbing visuals and persuasive narration.',
      documentary: 'Create an educational documentary script with informative visuals and authoritative narration.'
    };

    // Calculate optimal number of scenes (5-8 seconds per scene works best for TTS)
    const numberOfScenes = Math.max(3, Math.min(8, Math.ceil(duration / 7)));
    const sceneDuration = Math.floor(duration / numberOfScenes);
    const lastSceneDuration = duration - (sceneDuration * (numberOfScenes - 1)); // Adjust last scene for exact total
    
    const systemPrompt = `You are a professional video script writer. Create a detailed video script with EXACTLY ${numberOfScenes} scenes.
${stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.cinematic}

CRITICAL REQUIREMENTS:
- Total video MUST be EXACTLY ${duration} seconds total
- Scenes 1-${numberOfScenes - 1}: Each EXACTLY ${sceneDuration} seconds
- Scene ${numberOfScenes}: EXACTLY ${lastSceneDuration} seconds
- Narration length MUST match duration: approximately 2.5-3 words per second (e.g., ${sceneDuration} seconds = ${Math.floor(sceneDuration * 2.5)}-${Math.ceil(sceneDuration * 3)} words)
- Count your words carefully to match the exact scene duration

Return ONLY a JSON object with this exact structure (no markdown, no explanations):
{
  "title": "Video Title",
  "scenes": [
    {
      "scene_number": 1,
      "description": "Detailed visual description for AI image generation",
      "narration": "Narration text matching the EXACT duration",
      "duration": ${sceneDuration}
    },
    ...more scenes with scene ${numberOfScenes} having duration ${lastSceneDuration}
  ]
}

EXAMPLE for a ${sceneDuration}-second scene narration:
"${sceneDuration === 5 ? "A beautiful sunset paints the sky orange and pink." : sceneDuration === 7 ? "The camera slowly pans across the vast landscape, revealing mountains in the distance." : "Two cats engage in an intense boxing match under bright stage lights, their gloves gleaming."}"

Make descriptions vivid and specific for AI image generation. Keep narration concise and impactful.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON from the response
    let script;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      script = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse JSON:', content);
      throw new Error('Failed to parse script from AI response');
    }

    console.log('Script generated successfully:', script);

    return new Response(
      JSON.stringify(script),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});