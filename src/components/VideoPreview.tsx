import { Download, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface VideoPreviewProps {
  videoUrl?: string;
  images?: string[];
  onReset: () => void;
}

export const VideoPreview = ({ videoUrl, images, onReset }: VideoPreviewProps) => {
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
        {/* Preview Area */}
        <div className="aspect-video bg-muted/20 flex items-center justify-center p-8">
          {images && images.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 w-full h-full">
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
          ✨ Your AI-generated content is ready! This is the foundation for video generation.
        </p>
      </div>
    </div>
  );
};