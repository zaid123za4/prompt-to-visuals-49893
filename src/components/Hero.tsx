import { Sparkles } from "lucide-react";

export const Hero = () => {
  return (
    <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl animate-float" />
      
      <div className="relative z-10 text-center px-4 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-scale-in">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">AI-Powered Video Generation</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Create Videos
          <br />
          From Text
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Transform your ideas into stunning AI-generated videos in seconds.
          Choose your style, describe your vision, and let our AI bring it to life.
        </p>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-creative/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
    </div>
  );
};
