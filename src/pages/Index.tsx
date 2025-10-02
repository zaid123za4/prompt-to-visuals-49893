import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { PromptInput } from "@/components/PromptInput";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { VideoPreview } from "@/components/VideoPreview";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import type { VideoStyle } from "@/components/StyleSelector";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const { isGenerating, progress, currentStep, script, generatedScenes, generateVideo } = useVideoGeneration();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGenerate = async (prompt: string, style: VideoStyle) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      await generateVideo(prompt, style);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleReset = () => {
    window.location.reload();
  };

  // Convert video generation steps to progress indicator format
  const progressStatus: "pending" | "processing" | "completed" = isGenerating ? "processing" : "pending";
  const steps = [
    { id: "script", label: currentStep || "Preparing...", status: progressStatus },
  ];

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <Navbar />
      <Hero />
      
      {!isGenerating && generatedScenes.length === 0 && (
        <PromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
      )}
      
      {isGenerating && progress > 0 && <ProgressIndicator steps={steps} />}
      
      {!isGenerating && generatedScenes.length > 0 && (
        <VideoPreview 
          scenes={generatedScenes}
          images={generatedScenes.filter(s => s.imageUrl).map(s => s.imageUrl!)}
          onReset={handleReset} 
        />
      )}
    </div>
  );
};

export default Index;