import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API key from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No API key provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.replace("Bearer ", "");

    // Hash the provided key
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Verify API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update usage stats
    await supabase
      .from("api_keys")
      .update({
        usage_count: apiKeyData.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", apiKeyData.id);

    // Get request body
    const { prompt, style = "cinematic", duration = 30, aspectRatio = "16:9" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", apiKeyData.user_id)
      .single();

    const requiredCredits = 10;
    if (!profile || profile.credits < requiredCredits) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits",
          required: requiredCredits,
          available: profile?.credits || 0
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate script
    const { data: scriptData, error: scriptError } = await supabase.functions.invoke("generate-script", {
      body: { prompt, style, duration }
    });

    if (scriptError) throw scriptError;

    // Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: apiKeyData.user_id,
        title: scriptData.title,
        prompt,
        style,
        script: scriptData,
        status: "processing",
        duration: scriptData.scenes.reduce((sum: number, s: any) => sum + s.duration, 0),
        aspect_ratio: aspectRatio,
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Generate media for scenes (async process)
    for (let i = 0; i < scriptData.scenes.length; i++) {
      const scene = scriptData.scenes[i];

      const imagePromise = supabase.functions.invoke("generate-image", {
        body: { description: scene.description, style }
      });

      const audioPromise = supabase.functions.invoke("generate-voiceover", {
        body: { text: scene.narration, duration: scene.duration }
      });

      const [imageResult, audioResult] = await Promise.all([imagePromise, audioPromise]);

      await supabase.from("scenes").insert({
        project_id: project.id,
        scene_number: i + 1,
        description: scene.description,
        image_url: imageResult.data?.imageUrl,
        audio_url: audioResult.data?.audioUrl,
        duration: scene.duration,
        status: "completed",
        aspect_ratio: aspectRatio,
      });
    }

    // Create final video
    await supabase.functions.invoke("create-video", {
      body: { projectId: project.id }
    });

    // Deduct credits
    await supabase
      .from("profiles")
      .update({ credits: profile.credits - requiredCredits })
      .eq("user_id", apiKeyData.user_id);

    return new Response(
      JSON.stringify({
        projectId: project.id,
        status: "processing",
        message: "Video generation started. Check project status for completion."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});