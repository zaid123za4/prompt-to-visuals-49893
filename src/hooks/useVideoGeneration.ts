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
  audioUrl?: string;
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
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateVideo = async (prompt: string, style: string, duration: number, aspectRatio: string = "16:9") => {
    setIsGenerating(true);
    setProgress(0);
    setScript(null);
    setGeneratedScenes([]);
    setVideoUrl("");
    setProjectId("");

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
        body: { prompt, style, duration }
      });

      if (scriptError) throw scriptError;
      if (!scriptData) throw new Error('No script data received');

      setScript(scriptData);
      setProgress(40);

      // Step 2: Generate images and voiceovers for each scene
      setCurrentStep("Creating visuals and voiceovers...");
      const scenesWithMedia: Scene[] = [];

      for (let i = 0; i < scriptData.scenes.length; i++) {
        const scene = scriptData.scenes[i];
        setProgress(40 + (i / scriptData.scenes.length) * 50);

        try {
          // Generate image
          const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-image', {
            body: { 
              description: scene.description,
              style 
            }
          });

          // Generate voiceover using Groq TTS
          const { data: audioData, error: audioError } = await supabase.functions.invoke('generate-voiceover', {
            body: { 
              text: scene.narration,
              duration: scene.duration
            }
          });

          if (imageError || audioError) {
            console.error('Generation error for scene', i, { imageError, audioError });
            scenesWithMedia.push({
              ...scene,
              imageUrl: imageError ? undefined : imageData?.imageUrl,
              audioUrl: audioError ? undefined : audioData?.audioUrl,
              status: 'completed'
            });
          } else {
            scenesWithMedia.push({
              ...scene,
              imageUrl: imageData.imageUrl,
              audioUrl: audioData.audioUrl,
              status: 'completed'
            });
          }
        } catch (error) {
          console.error('Error generating media for scene', i, error);
          scenesWithMedia.push({
            ...scene,
            imageUrl: undefined,
            audioUrl: undefined,
            status: 'failed'
          });
        }
      }

      setGeneratedScenes(scenesWithMedia);
      setProgress(90);

      // Step 3: Create final video
      setCurrentStep("Creating final video...");
      setProgress(90);

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          user_id: user.id,
          title: scriptData.title,
          prompt,
          style: style as any,
          script: scriptData,
          status: 'generating',
          duration: scriptData.scenes.reduce((sum: number, s: Scene) => sum + s.duration, 0),
          aspect_ratio: aspectRatio
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Save scenes
      const scenesData = scenesWithMedia.map((scene, idx) => ({
        project_id: project.id,
        scene_number: idx + 1,
        description: scene.description,
        image_url: scene.imageUrl,
        audio_url: scene.audioUrl,
        duration: scene.duration,
        status: scene.status as any,
        aspect_ratio: aspectRatio
      }));

      await supabase.from('scenes').insert(scenesData);

      // Create final merged video using FFmpeg-based service
      setCurrentStep("Merging video with FFmpeg...");
      setProgress(95);

      const { data: videoData, error: videoError } = await supabase.functions.invoke('create-video', {
        body: { projectId: project.id }
      });

      if (videoError) {
        console.error('Video creation error:', videoError);
        throw new Error('Failed to create final video');
      }

      // Deduct credits
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - requiredCredits })
        .eq('user_id', user.id);

      // Step 4: Complete
      setCurrentStep("Complete!");
      setProgress(100);
      setVideoUrl(videoData.videoUrl);
      setProjectId(project.id);

      toast({
        title: "Video generated!",
        description: `Your video has been saved. ${profile.credits - requiredCredits} credits remaining.`,
      });

      return {
        script: scriptData,
        scenes: scenesWithMedia,
        projectId: project.id,
        videoUrl: videoData.videoUrl
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
    videoUrl,
    projectId,
    generateVideo
  };
};