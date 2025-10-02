import { Download, RefreshCw, Play, Pause } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect, useRef } from "react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasScenes = scenes && scenes.length > 0;
  const currentScene = hasScenes ? scenes[currentSceneIndex] : null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        if (hasScenes && currentSceneIndex < scenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentSceneIndex(0);
        }
      };
    }
  }, [currentSceneIndex, hasScenes, scenes]);

  useEffect(() => {
    if (isPlaying && currentScene?.audioUrl && audioRef.current) {
      audioRef.current.src = currentScene.audioUrl;
      audioRef.current.play();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSceneIndex, currentScene]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!images || images.length === 0) return;

    images.forEach((img, index) => {
      const link = document.createElement('a');
      link.href = img;
      link.download = `scene-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden shadow-elevated">
        {/* Video Player Area */}
        <div className="relative aspect-video bg-muted/20 flex items-center justify-center">
          {hasScenes ? (
            <>
              {/* Current Scene Image */}
              {currentScene?.imageUrl && (
                <img
                  src={currentScene.imageUrl}
                  alt={`Scene ${currentSceneIndex + 1}`}
                  className="w-full h-full object-cover"
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

              {/* Play/Pause Button */}
              <button
                onClick={togglePlayback}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary/90 hover:bg-primary text-white rounded-full p-6 transition-all duration-300 shadow-glow"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </button>

              {/* Scene Progress */}
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">
                  Scene {currentSceneIndex + 1} / {scenes.length}
                </span>
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
            className="flex-1 border-border hover:border-primary transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Create New
          </Button>
          
          {(videoUrl || (images && images.length > 0)) && (
            <Button
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-glow"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Scenes
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