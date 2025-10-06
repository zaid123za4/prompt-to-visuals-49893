import { MonitorPlay, Smartphone, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";

interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  description: string;
  icon: typeof MonitorPlay;
}

const ratios: AspectRatioOption[] = [
  {
    value: "16:9",
    label: "16:9",
    description: "Landscape (YouTube)",
    icon: MonitorPlay,
  },
  {
    value: "9:16",
    label: "9:16",
    description: "Portrait (TikTok, Reels)",
    icon: Smartphone,
  },
  {
    value: "1:1",
    label: "1:1",
    description: "Square (Instagram)",
    icon: Square,
  },
  {
    value: "4:3",
    label: "4:3",
    description: "Classic TV",
    icon: MonitorPlay,
  },
];

interface AspectRatioSelectorProps {
  selectedRatio: AspectRatio;
  onRatioChange: (ratio: AspectRatio) => void;
}

export const AspectRatioSelector = ({ selectedRatio, onRatioChange }: AspectRatioSelectorProps) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-3 text-foreground">
        Aspect Ratio
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ratios.map((ratio) => {
          const Icon = ratio.icon;
          const isSelected = selectedRatio === ratio.value;
          
          return (
            <button
              key={ratio.value}
              onClick={() => onRatioChange(ratio.value)}
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
                  <div className="font-semibold text-sm">{ratio.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {ratio.description}
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