import { Download, RefreshCw, Play, Pause, SkipForward, SkipBack, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useState, useEffect, useRef } from "react";
import { Progress } from "./ui/progress";
import { useToast } from "./ui/use-toast";
import type { Scene } from "@/hooks/useVideoGeneration";

interface VideoPreviewProps {
  videoUrl?: string;
  scenes?: Scene[];
  images?: string[];
  onReset: () => void;
  projectId?: string;
}

export const VideoPreview = ({ videoUrl, scenes, images, onReset, projectId }: VideoPreviewProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();

  const hasScenes = scenes && scenes.length > 0;
  const currentScene = hasScenes ? scenes[currentSceneIndex] : null;

  // 🎧 Handle audio playback (for scene preview mode)
  useEffect(() => {
    if (videoUrl || !hasScenes || !currentScene?.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (isPlaying) {
      const audio = new Audio(currentScene.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        if (currentSceneIndex < scenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
          setAudioProgress(0);
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
        console.error("Audio playback error:", err);
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
  }, [isPlaying, currentSceneIndex, hasScenes, currentScene, scenes, toast, videoUrl]);

  // ▶️ Toggle scene playback
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setAudioProgress(0);
    }
  };

  const nextScene = () => {
    if (hasScenes && currentSceneIndex < scenes.length - 1) {
      setIsPlaying(false);
      setCurrentSceneIndex(prev => prev + 1);
      setAudioProgress(0);
    }
  };

  const previousScene = () => {
    if (currentSceneIndex > 0) {
      setIsPlaying(false);
      setCurrentSceneIndex(prev => prev - 1);
      setAudioProgress(0);
    }
  };

  // 💾 Handle video download (Blob-safe + toast feedback)
  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      setIsDownloading(true);
      toast({
        title: "Preparing download...",
        description: "Your video is being fetched...",
      });

      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${projectId || Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Download started!",
        description: "Your video is being saved.",
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download failed",
        description: "Unable to save your video. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* 🎥 Video or Image Preview */}
          <div className="relative aspect-video bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full"
                controlsList="nodownload"
              />
            ) : scenes && scenes.length > 0 ? (
              <>
                <img
                  src={scenes[currentSceneIndex]?.imageUrl || "/placeholder.svg"}
                  alt={`Scene ${currentSceneIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  Scene {currentSceneIndex + 1} of {scenes.length}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </>
            ) : images && images.length > 0 ? (
              <img
                src={images[0]}
                alt="Generated preview"
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          {/* 🎚️ Scene Playback Controls */}
          {!videoUrl && scenes && scenes.length > 0 && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={previousScene}
                  disabled={currentSceneIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button size="icon" onClick={togglePlayback} className="h-12 w-12">
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextScene}
                  disabled={currentSceneIndex === scenes.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ⚙️ Action Buttons */}
          <div className="p-6 border-t border-border space-y-4">
            <div className="flex gap-4">
              <Button onClick={onReset} className="flex-1" variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Create New
              </Button>

              {videoUrl && (
                <Button
                  onClick={handleDownload}
                  className="flex-1"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download MP4
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {videoUrl
                ? "🎉 Video ready — download your masterpiece!"
                : "⚙️ Generating your AI video..."}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
