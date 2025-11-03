import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    console.log('Creating video for project:', projectId);

    const CREATOMATE_API_KEY = Deno.env.get('CREATOMATE_API_KEY');
    if (!CREATOMATE_API_KEY) {
      throw new Error('CREATOMATE_API_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch project and scenes
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('*')
      .eq('project_id', projectId)
      .order('scene_number', { ascending: true });

    if (scenesError || !scenes || scenes.length === 0) {
      throw new Error('No scenes found for this project');
    }

    console.log(`Found ${scenes.length} scenes to merge`);
    console.log('Project aspect ratio:', project.aspect_ratio);

    // Map aspect ratio to dimensions
    const aspectRatioMap: Record<string, { width: number; height: number }> = {
      '9:16': { width: 720, height: 1280 },  // YouTube Shorts/TikTok vertical
      '16:9': { width: 1280, height: 720 },  // Standard horizontal
      '1:1': { width: 1080, height: 1080 },  // Square
      '4:3': { width: 1024, height: 768 }    // Classic
    };

    const dimensions = aspectRatioMap[project.aspect_ratio] || aspectRatioMap['16:9'];
    console.log('Using dimensions:', dimensions);

    // Build Creatomate compositions for each scene
    const compositions = scenes.map((scene: any, index: number) => {
      console.log(`Processing scene ${index + 1}:`, {
        image_url: scene.image_url?.substring(0, 50) + '...',
        audio_url: scene.audio_url?.substring(0, 50) + '...',
        duration: scene.duration
      });

      const elements: any[] = [
        {
          type: 'image',
          source: scene.image_url,
          duration: scene.duration || 5
        }
      ];

      // Add audio if available
      if (scene.audio_url) {
        elements.push({
          type: 'audio',
          source: scene.audio_url,
          duration: scene.duration || 5
        });
      }

      return {
        type: 'composition',
        track: 1,
        elements
      };
    });

    // Create Creatomate render request
    const renderRequest = {
      output_format: 'mp4',
      width: dimensions.width,
      height: dimensions.height,
      elements: compositions
    };

    console.log('Sending render request to Creatomate...');

    // Submit render to Creatomate
    const renderResponse = await fetch('https://api.creatomate.com/v2/renders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CREATOMATE_API_KEY}`
      },
      body: JSON.stringify(renderRequest)
    });

    if (!renderResponse.ok) {
      const error = await renderResponse.text();
      console.error('Creatomate render error:', error);
      throw new Error(`Failed to start video render: ${error}`);
    }

    const renderData = await renderResponse.json();
    console.log('Render response:', renderData);

    // Creatomate returns either a direct URL or a render ID we need to poll
    let videoUrl = null;

    if (renderData.url) {
      // Direct URL available
      videoUrl = renderData.url;
      console.log('Video ready immediately:', videoUrl);
    } else if (renderData.id) {
      // Need to poll for completion
      const renderId = renderData.id;
      console.log('Polling for render completion, ID:', renderId);

      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (!videoUrl && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`https://api.creatomate.com/v2/renders/${renderId}`, {
          headers: {
            'Authorization': `Bearer ${CREATOMATE_API_KEY}`
          }
        });

        if (!statusResponse.ok) {
          throw new Error('Failed to check render status');
        }

        const statusData = await statusResponse.json();
        console.log(`Render status: ${statusData.status}`);

        if (statusData.status === 'succeeded' && statusData.url) {
          videoUrl = statusData.url;
        } else if (statusData.status === 'failed') {
          throw new Error('Video render failed');
        }

        attempts++;
      }

      if (!videoUrl) {
        throw new Error('Video render timed out');
      }
    } else {
      throw new Error('Unexpected response from Creatomate API');
    }

    console.log('Video created successfully:', videoUrl);

    // Update project with video URL
    await supabase
      .from('projects')
      .update({
        video_url: videoUrl,
        status: 'completed'
      })
      .eq('id', projectId);

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl,
        projectId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-video:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
