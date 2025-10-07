import { Download, RefreshCw, Play, Pause, SkipForward, SkipBack, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useState, useEffect, useRef } from "react";
import { useToast } from "./ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
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

  // 🎧 Scene audio logic
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

  // ▶️ Scene controls
  const togglePlayback = () => setIsPlaying(!isPlaying);
  const nextScene = () => currentSceneIndex < (scenes?.length ?? 0) - 1 && setCurrentSceneIndex(i => i + 1);
  const previousScene = () => currentSceneIndex > 0 && setCurrentSceneIndex(i => i - 1);

  // 💾 Handle video download
  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      setIsDownloading(true);
      toast({ title: "Preparing download...", description: "Fetching your video..." });
      
      // Try direct download first (works for same-origin or CORS-enabled URLs)
      const response = await fetch(videoUrl, {
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${projectId || Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "✅ Download complete!", description: "Your video has been saved." });
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab if CORS blocks download
      toast({
        title: "Opening video",
        description: "Click 'Save As' to download the video.",
      });
      window.open(videoUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="container mx-auto px-4 py-8 max-w-4xl"
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* 🎥 Animated Preview */}
          <div className="relative aspect-video bg-black overflow-hidden">
            <AnimatePresence mode="wait">
              {videoUrl ? (
                <motion.video
                  key="final-video"
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              ) : hasScenes ? (
                <motion.img
                  key={currentSceneIndex}
                  src={currentScene?.imageUrl || "/placeholder.svg"}
                  alt={`Scene ${currentSceneIndex + 1}`}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.6 }}
                />
              ) : images && images.length > 0 ? (
                <motion.img
                  key="preview-image"
                  src={images[0]}
                  alt="Generated preview"
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ) : null}
            </AnimatePresence>

            {/* Scene indicator */}
            {hasScenes && !videoUrl && (
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                Scene {currentSceneIndex + 1} / {scenes.length}
              </div>
            )}
          </div>

          {/* 🎚️ Scene Controls */}
          {!videoUrl && hasScenes && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={previousScene} disabled={currentSceneIndex === 0}>
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button size="icon" onClick={togglePlayback} className="h-12 w-12">
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>

                <Button variant="outline" size="icon" onClick={nextScene} disabled={currentSceneIndex === scenes.length - 1}>
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
                <Button onClick={handleDownload} className="flex-1" disabled={isDownloading}>
                  {isDownloading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Download MP4
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {videoUrl ? "🎉 Video ready — download your masterpiece!" : "⚙️ Generating your AI video..."}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
