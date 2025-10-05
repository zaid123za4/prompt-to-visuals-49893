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

    const SHOTSTACK_API_KEY = Deno.env.get('SHOTSTACK_API_KEY');
    if (!SHOTSTACK_API_KEY) {
      throw new Error('SHOTSTACK_API_KEY is not configured');
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

    // Build Shotstack timeline with proper sequential timing
    let currentTime = 0;
    const videoClips = scenes.map((scene: any) => {
      const clip: any = {
        asset: {
          type: 'image',
          src: scene.image_url
        },
        start: currentTime,
        length: scene.duration || 5
      };
      currentTime += scene.duration || 5;
      return clip;
    });

    // Build audio track separately
    currentTime = 0;
    const audioClips = scenes
      .filter((scene: any) => scene.audio_url)
      .map((scene: any) => ({
        asset: {
          type: 'audio',
          src: scene.audio_url
        },
        start: currentTime,
        length: scene.duration || 5
      }));

    // Create Shotstack edit request with separate video and audio tracks
    const tracks: any[] = [
      {
        clips: videoClips
      }
    ];

    // Add audio track if we have audio clips
    if (audioClips.length > 0) {
      tracks.push({
        clips: audioClips
      });
    }

    const edit = {
      timeline: {
        background: '#000000',
        tracks
      },
      output: {
        format: 'mp4',
        resolution: 'sd',
        fps: 25
      }
    };

    console.log('Sending render request to Shotstack...');

    // Submit render to Shotstack
    const renderResponse = await fetch('https://api.shotstack.io/edit/stage/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SHOTSTACK_API_KEY
      },
      body: JSON.stringify(edit)
    });

    if (!renderResponse.ok) {
      const error = await renderResponse.text();
      console.error('Shotstack render error:', error);
      throw new Error(`Failed to start video render: ${error}`);
    }

    const renderData = await renderResponse.json();
    const renderId = renderData.response.id;

    console.log('Render started with ID:', renderId);

    // Poll for render completion
    let videoUrl = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await fetch(`https://api.shotstack.io/edit/stage/render/${renderId}`, {
        headers: {
          'x-api-key': SHOTSTACK_API_KEY
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check render status');
      }

      const statusData = await statusResponse.json();
      const status = statusData.response.status;

      console.log(`Render status: ${status}`);

      if (status === 'done') {
        videoUrl = statusData.response.url;
      } else if (status === 'failed') {
        throw new Error('Video render failed');
      }

      attempts++;
    }

    if (!videoUrl) {
      throw new Error('Video render timed out');
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
