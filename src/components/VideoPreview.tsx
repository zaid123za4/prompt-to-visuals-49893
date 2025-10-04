import { Download, RefreshCw, Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect, useRef } from "react";
import { Progress } from "./ui/progress";
import { useToast } from "./ui/use-toast";
import type { Scene } from "@/hooks/useVideoGeneration";

interface VideoPreviewProps {
  videoUrl?: string;
  scenes?: Scene[];
  images?: string[];
  onReset: () => void;
}

export const VideoPreview = ({ videoUrl, scenes, images, onReset }: VideoPreviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  const hasScenes = scenes && scenes.length > 0;
  const currentScene = hasScenes ? scenes[currentSceneIndex] : null;

  // Handle audio playback for scenes
  useEffect(() => {
    if (!hasScenes || !currentScene?.audioUrl) return;

    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (isPlaying) {
      const audio = new Audio(currentScene.audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        if (currentSceneIndex < scenes.length - 1) {
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentSceneIndex(prev => prev + 1);
            setIsTransitioning(false);
            setAudioProgress(0);
          }, 500);
        } else {
          setIsPlaying(false);
          setCurrentSceneIndex(0);
          setAudioProgress(0);
        }
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.play().catch(err => {
        console.error('Audio playback error:', err);
        toast({
          title: "Playback error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      });

      return () => {
        audio.pause();
        audio.onended = null;
        audio.ontimeupdate = null;
      };
    } else {
      setAudioProgress(0);
    }
  }, [isPlaying, currentSceneIndex, hasScenes, currentScene, scenes, toast]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setAudioProgress(0);
    }
  };

  const nextScene = () => {
    if (hasScenes && currentSceneIndex < scenes.length - 1) {
      setIsTransitioning(true);
      setIsPlaying(false);
      setTimeout(() => {
        setCurrentSceneIndex(prev => prev + 1);
        setIsTransitioning(false);
        setAudioProgress(0);
      }, 300);
    }
  };

  const previousScene = () => {
    if (currentSceneIndex > 0) {
      setIsTransitioning(true);
      setIsPlaying(false);
      setTimeout(() => {
        setCurrentSceneIndex(prev => prev - 1);
        setIsTransitioning(false);
        setAudioProgress(0);
      }, 300);
    }
  };

  const handleDownload = async () => {
    if (!hasScenes) return;

    // Download all scene images and audio
    scenes.forEach((scene, index) => {
      if (scene.imageUrl) {
        const imgLink = document.createElement('a');
        imgLink.href = scene.imageUrl;
        imgLink.download = `scene-${index + 1}.png`;
        document.body.appendChild(imgLink);
        imgLink.click();
        document.body.removeChild(imgLink);
      }
    });

    toast({
      title: "Download started",
      description: "All scenes are being downloaded.",
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden shadow-glow">
        {/* Video Player Area */}
        <div className="relative aspect-video bg-muted/20 flex items-center justify-center overflow-hidden">
          {hasScenes ? (
            <>
              {/* Current Scene Image with Transition */}
              {currentScene?.imageUrl && (
                <img
                  src={currentScene.imageUrl}
                  alt={`Scene ${currentSceneIndex + 1}`}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  }`}
                />
              )}
              
              {/* Subtitles Overlay */}
              {currentScene?.narration && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-4">
                  <p className="text-white text-center text-lg font-medium">
                    {currentScene.narration}
                  </p>
                </div>
              )}

              {/* Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-4">
                <button
                  onClick={previousScene}
                  disabled={currentSceneIndex === 0}
                  className="bg-black/70 hover:bg-black/90 text-white rounded-full p-4 transition-all duration-300 disabled:opacity-30 hover-scale disabled:hover:scale-100"
                >
                  <SkipBack className="w-6 h-6" />
                </button>

                <button
                  onClick={togglePlayback}
                  className="bg-primary/90 hover:bg-primary text-white rounded-full p-8 transition-all duration-300 shadow-glow hover-scale"
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10" />
                  ) : (
                    <Play className="w-10 h-10 ml-1" />
                  )}
                </button>

                <button
                  onClick={nextScene}
                  disabled={currentSceneIndex === scenes.length - 1}
                  className="bg-black/70 hover:bg-black/90 text-white rounded-full p-4 transition-all duration-300 disabled:opacity-30 hover-scale disabled:hover:scale-100"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              {/* Scene Counter */}
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full animate-fade-in">
                <span className="text-white text-sm font-medium">
                  Scene {currentSceneIndex + 1} / {scenes.length}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-20 left-4 right-4">
                <Progress value={audioProgress} className="h-1 bg-black/50" />
              </div>
            </>
          ) : images && images.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 w-full h-full p-8">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="relative rounded-lg overflow-hidden animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <img
                    src={img}
                    alt={`Generated frame ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full h-full rounded-lg"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <p>No preview available</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-card/80 backdrop-blur-sm border-t border-border flex gap-4">
          <Button
            onClick={onReset}
            variant="outline"
            className="flex-1 border-border hover:border-primary transition-all duration-300 hover-scale"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Create New
          </Button>
          
          {hasScenes && (
            <Button
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-glow hover-scale"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Video
            </Button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <p className="text-sm text-muted-foreground text-center">
          ✨ Your AI-generated video is ready! Click play to watch with voiceover and subtitles.
        </p>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};