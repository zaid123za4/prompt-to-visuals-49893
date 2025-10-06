import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { StyleSelector, VideoStyle } from "./StyleSelector";
import { DurationSelector, VideoDuration } from "./DurationSelector";
import { AspectRatioSelector, AspectRatio } from "./AspectRatioSelector";

interface PromptInputProps {
  onGenerate: (prompt: string, style: VideoStyle, duration: VideoDuration, aspectRatio: AspectRatio) => void;
  isGenerating: boolean;
}

export const PromptInput = ({ onGenerate, isGenerating }: PromptInputProps) => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>("cinematic");
  const [selectedDuration, setSelectedDuration] = useState<VideoDuration>(30);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("16:9");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt, selectedStyle, selectedDuration, selectedRatio);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video... (e.g., 'A serene sunset over a mountain lake with birds flying')"
            className="min-h-[120px] resize-none bg-card/50 backdrop-blur-sm border-border focus:border-primary transition-all duration-300 text-base"
            disabled={isGenerating}
          />
        </div>

        <StyleSelector
          selectedStyle={selectedStyle}
          onStyleChange={setSelectedStyle}
        />

        <DurationSelector
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
        />

        <AspectRatioSelector
          selectedRatio={selectedRatio}
          onRatioChange={setSelectedRatio}
        />

        <Button
          type="submit"
          disabled={!prompt.trim() || isGenerating}
          className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-glow hover:shadow-glow-creative disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
              Generate Video
            </>
          )}
        </Button>
      </form>
    </div>
  );
};
