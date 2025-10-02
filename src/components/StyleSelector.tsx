import { Film, Palette, Video, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoStyle = "anime" | "cinematic" | "vlog" | "realistic";

interface StyleOption {
  id: VideoStyle;
  label: string;
  description: string;
  icon: typeof Film;
}

const styles: StyleOption[] = [
  {
    id: "anime",
    label: "Anime",
    description: "Japanese animation style",
    icon: Palette,
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Hollywood movie quality",
    icon: Film,
  },
  {
    id: "vlog",
    label: "Vlog",
    description: "Personal video blog style",
    icon: Video,
  },
  {
    id: "realistic",
    label: "Realistic",
    description: "Photo-realistic rendering",
    icon: Camera,
  },
];

interface StyleSelectorProps {
  selectedStyle: VideoStyle;
  onStyleChange: (style: VideoStyle) => void;
}

export const StyleSelector = ({ selectedStyle, onStyleChange }: StyleSelectorProps) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-3 text-foreground">
        Choose Style
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {styles.map((style) => {
          const Icon = style.icon;
          const isSelected = selectedStyle === style.id;
          
          return (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-300 group",
                "hover:scale-105 hover:shadow-elevated",
                isSelected
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "p-3 rounded-lg transition-all duration-300",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/20"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{style.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {style.description}
                  </div>
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute inset-0 rounded-xl animate-glow-pulse pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
