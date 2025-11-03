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

    console.log('Generating image with aspect ratio:', aspectRatio);

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

    // Add EXPLICIT aspect ratio instructions to prompt
    const aspectRatioDescriptions: Record<string, string> = {
      '9:16': 'IMPORTANT: Create a VERTICAL image in 9:16 aspect ratio (portrait orientation). The image MUST be TALL and NARROW, optimized for mobile/vertical video format like TikTok, Instagram Reels, YouTube Shorts. Portrait orientation is MANDATORY. DO NOT create horizontal/landscape images.',
      '16:9': 'horizontal format 16:9 aspect ratio, landscape orientation, widescreen',
      '1:1': 'square format 1:1 aspect ratio, equal width and height',
      '4:3': 'classic format 4:3 aspect ratio, standard display'
    };

    const aspectRatioDesc = aspectRatioDescriptions[aspectRatio] || aspectRatioDescriptions['16:9'];
    const enhancedPrompt = `${aspectRatioDesc}\n\nScene description: ${description}\n\nStyle: ${styleEnhancements[style as keyof typeof styleEnhancements] || styleEnhancements.realistic}\n\nQuality: 4K, high quality, detailed`;
    
    console.log('Enhanced prompt with explicit aspect ratio:', enhancedPrompt);

    console.log('Generating image with prompt:', enhancedPrompt);

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

    // For 9:16, use image editing to enforce aspect ratio
    let finalBase64Image = base64Image;
    if (aspectRatio === '9:16') {
      console.log('Applying 9:16 crop to ensure portrait orientation...');
      
      const cropResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: [
                {
                  type: 'text',
                  text: 'CRITICAL: Crop this image to EXACT 9:16 portrait aspect ratio (vertical/tall). Make it 720x1280 pixels. The image MUST be VERTICAL and TALL. Remove any horizontal/landscape content. Focus on the center and make it portrait orientation.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (cropResponse.ok) {
        const cropData = await cropResponse.json();
        const croppedImage = cropData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (croppedImage) {
          finalBase64Image = croppedImage;
          console.log('Successfully cropped to 9:16');
        }
      }
    }

    // Convert base64 to buffer and upload to Supabase storage
    const base64Data = finalBase64Image.split(',')[1];
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