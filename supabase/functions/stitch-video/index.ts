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
    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    console.log('Stitching video for project:', projectId);

    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch project and scenes
    const projectResponse = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const projects = await projectResponse.json();
    if (!projects || projects.length === 0) {
      throw new Error('Project not found');
    }

    const scenesResponse = await fetch(`${SUPABASE_URL}/rest/v1/scenes?project_id=eq.${projectId}&select=*&order=scene_number.asc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const scenes = await scenesResponse.json();
    
    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes found for this project');
    }

    console.log(`Found ${scenes.length} scenes to stitch`);

    // For now, we'll create a metadata response that the frontend can use
    // In a production environment, you'd use FFmpeg or a video API service here
    const videoMetadata = {
      projectId,
      scenes: scenes.map((scene: any) => ({
        sceneNumber: scene.scene_number,
        imageUrl: scene.image_url,
        audioUrl: scene.audio_url,
        duration: scene.duration,
      })),
      totalDuration: scenes.reduce((sum: number, scene: any) => sum + (scene.duration || 5), 0),
      status: 'ready',
    };

    // Update project with video metadata
    await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: 'completed',
        video_url: `generated-video-${projectId}`,
      }),
    });

    console.log('Video stitching metadata created successfully');

    return new Response(
      JSON.stringify(videoMetadata),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stitch-video:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
