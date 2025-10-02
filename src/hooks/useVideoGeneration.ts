import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface Scene {
  scene_number: number;
  description: string;
  narration: string;
  duration: number;
  imageUrl?: string;
  status?: string;
}

export interface VideoScript {
  title: string;
  scenes: Scene[];
}

export const useVideoGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [script, setScript] = useState<VideoScript | null>(null);
  const [generatedScenes, setGeneratedScenes] = useState<Scene[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateVideo = async (prompt: string, style: string) => {
    setIsGenerating(true);
    setProgress(0);
    setScript(null);
    setGeneratedScenes([]);

    try {
      // Check user credits
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      const requiredCredits = 10; // Cost per video generation
      if (!profile || profile.credits < requiredCredits) {
        toast({
          title: "Insufficient credits",
          description: `You need ${requiredCredits} credits to generate a video. Current balance: ${profile?.credits || 0}`,
          variant: "destructive",
        });
        return;
      }

      // Step 1: Generate script
      setCurrentStep("Generating script...");
      setProgress(20);

      const { data: scriptData, error: scriptError } = await supabase.functions.invoke('generate-script', {
        body: { prompt, style }
      });

      if (scriptError) throw scriptError;
      if (!scriptData) throw new Error('No script data received');

      setScript(scriptData);
      setProgress(40);

      // Step 2: Generate images for each scene
      setCurrentStep("Creating visuals...");
      const scenesWithImages: Scene[] = [];

      for (let i = 0; i < scriptData.scenes.length; i++) {
        const scene = scriptData.scenes[i];
        setProgress(40 + (i / scriptData.scenes.length) * 40);

        try {
          const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
            body: { 
              description: scene.description,
              style 
            }
          });

          if (imageError) {
            console.error('Image generation error for scene', i, imageError);
            scenesWithImages.push({
              ...scene,
              imageUrl: undefined,
              status: 'failed'
            });
          } else {
            scenesWithImages.push({
              ...scene,
              imageUrl: imageData.imageUrl,
              status: 'completed'
            });
          }
        } catch (error) {
          console.error('Error generating image for scene', i, error);
          scenesWithImages.push({
            ...scene,
            imageUrl: undefined,
            status: 'failed'
          });
        }
      }

      setGeneratedScenes(scenesWithImages);
      setProgress(80);

      // Step 3: Save project and deduct credits
      setCurrentStep("Saving project...");
      setProgress(90);

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: scriptData.title,
          prompt,
          style: style as any,
          script: scriptData,
          status: 'completed',
          duration: scriptData.scenes.reduce((sum: number, s: Scene) => sum + s.duration, 0)
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Save scenes
      const scenesData = scenesWithImages.map((scene, idx) => ({
        project_id: project.id,
        scene_number: idx + 1,
        description: scene.description,
        image_url: scene.imageUrl,
        duration: scene.duration,
        status: scene.status as any
      }));

      await supabase.from('scenes').insert(scenesData);

      // Deduct credits
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - requiredCredits })
        .eq('user_id', user.id);

      // Step 4: Complete
      setCurrentStep("Complete!");
      setProgress(100);

      toast({
        title: "Video generated!",
        description: `Your video has been saved. ${profile.credits - requiredCredits} credits remaining.`,
      });

      return {
        script: scriptData,
        scenes: scenesWithImages,
        projectId: project.id
      };

    } catch (error: any) {
      console.error('Video generation error:', error);
      
      let errorMessage = 'Failed to generate video';
      if (error.message?.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.message?.includes('Payment required')) {
        errorMessage = 'Credits depleted. Please add more credits.';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsGenerating(false);
      setCurrentStep("");
    }
  };

  return {
    isGenerating,
    progress,
    currentStep,
    script,
    generatedScenes,
    generateVideo
  };
};