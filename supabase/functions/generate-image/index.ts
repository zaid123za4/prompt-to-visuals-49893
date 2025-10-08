import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
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
    const { description, style, aspectRatio = '16:9' } = await req.json();

    if (!description) {
      throw new Error('Description is required');
    }

    // Map aspect ratio to dimensions
    const aspectRatioDimensions: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720, height: 1280 },
      '1:1': { width: 1080, height: 1080 },
      '4:3': { width: 1024, height: 768 }
    };

    const dimensions = aspectRatioDimensions[aspectRatio] || aspectRatioDimensions['16:9'];
    const dimensionPrompt = `${dimensions.width}x${dimensions.height} aspect ratio`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Enhance prompt based on style
    const styleEnhancements = {
      cinematic: 'cinematic lighting, film grain, anamorphic lens, epic composition, professional color grading',
      anime: 'anime style, vibrant colors, manga art style, detailed linework, Studio Ghibli quality',
      vlog: 'natural lighting, casual photography, authentic moment, street photography style',
      realistic: 'photorealistic, natural lighting, high detail, professional photography',
      advertisement: 'commercial photography, perfect lighting, product showcase, professional marketing',
      documentary: 'documentary photography, natural setting, authentic moment, National Geographic style'
    };

    const enhancedPrompt = `${description}, ${styleEnhancements[style as keyof typeof styleEnhancements] || styleEnhancements.realistic}, ${dimensionPrompt}, 4K, high quality, detailed`;

    console.log('Generating image with prompt:', enhancedPrompt);
    console.log('Target dimensions:', dimensions);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text']
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
    const base64Image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!base64Image) {
      throw new Error('No image generated');
    }

    // Convert base64 to buffer and upload to Supabase storage
    const base64Data = base64Image.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `image-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({ imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});