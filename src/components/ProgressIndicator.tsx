import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed";
}

interface ProgressIndicatorProps {
  steps: Step[];
}

export const ProgressIndicator = ({ steps }: ProgressIndicatorProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-elevated">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4">
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  step.status === "completed" && "bg-primary text-primary-foreground",
                  step.status === "processing" && "bg-primary/20 text-primary animate-glow-pulse",
                  step.status === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {step.status === "completed" && <CheckCircle2 className="w-5 h-5" />}
                {step.status === "processing" && <Loader2 className="w-5 h-5 animate-spin" />}
                {step.status === "pending" && <span className="text-sm font-semibold">{index + 1}</span>}
              </div>

              <div className="flex-1">
                <div
                  className={cn(
                    "text-base font-medium transition-colors duration-300",
                    step.status === "completed" && "text-foreground",
                    step.status === "processing" && "text-primary",
                    step.status === "pending" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </div>
              </div>

              {step.status !== "pending" && index < steps.length - 1 && (
                <div className="flex-shrink-0 w-full max-w-[200px] h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full bg-gradient-primary transition-all duration-500",
                      step.status === "completed" ? "w-full" : "w-1/2 animate-pulse"
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
