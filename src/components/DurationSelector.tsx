import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoDuration = 30 | 60 | 90 | 120;

interface DurationOption {
  value: VideoDuration;
  label: string;
}

const durations: DurationOption[] = [
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
  { value: 90, label: "90s" },
  { value: 120, label: "2min" },
];

interface DurationSelectorProps {
  selectedDuration: VideoDuration;
  onDurationChange: (duration: VideoDuration) => void;
}

export const DurationSelector = ({ selectedDuration, onDurationChange }: DurationSelectorProps) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-3 text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Video Duration
      </label>
      <div className="grid grid-cols-4 gap-3">
        {durations.map((duration) => {
          const isSelected = selectedDuration === duration.value;
          
          return (
            <button
              key={duration.value}
              onClick={() => onDurationChange(duration.value)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-300",
                "hover:scale-105 hover:shadow-elevated",
                isSelected
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "font-semibold text-lg",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {duration.label}
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
