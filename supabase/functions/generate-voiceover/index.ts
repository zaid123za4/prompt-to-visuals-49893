import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) throw new Error("Text is required");

    console.log("Generating full voiceover for text:", text.slice(0, 60) + "...");

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "playai-tts",
        voice: "Basil-PlayAI",
        input: text,
        response_format: "wav",
      }),
    });

    if (!response.ok || !response.body) {
      const err = await response.text();
      throw new Error("TTS generation failed: " + err);
    }

    // ✅ Properly read streamed data to avoid 5s cutoff
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const audioBuffer = await new Blob(chunks).arrayBuffer();

    // Upload to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `audio-${Date.now()}.wav`;
    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(fileName, audioBuffer, { contentType: "audio/wav" });

    if (uploadError) throw new Error(`Failed to upload: ${uploadError.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from("audio").getPublicUrl(fileName);

    console.log("✅ Full voiceover ready:", publicUrl);

    return new Response(
      JSON.stringify({
        audioUrl: publicUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-voiceover:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
