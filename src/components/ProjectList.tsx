import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { Loader2, Play, Trash2, Clock, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";

interface Project {
  id: string;
  title: string;
  prompt: string;
  style: string;
  status: string;
  duration?: number;
  thumbnail_url?: string;
  created_at: string;
  scenes?: { count: number }[];
  video_url?: string;
}

export const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*, scenes(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      loadProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProjectDownload = async (videoUrl: string | undefined, projectId: string) => {
    if (!videoUrl) {
      toast({
        title: "No video available",
        description: "This project doesn't have a generated video yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Failed to fetch video");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${projectId}.mp4`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Download started",
        description: "Your video is being saved.",
      });
    } catch (error: any) {
      console.error("Download failed:", error);
      toast({
        title: "Download failed",
        description: error.message || "Unable to download the video.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No projects yet. Create your first video!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Card key={project.id} className="overflow-hidden hover:shadow-glow transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="truncate flex-1">{project.title}</CardTitle>
              <Badge variant="secondary" className="ml-2">{project.style}</Badge>
            </div>
            <CardDescription className="line-clamp-2">{project.prompt}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Clock className="w-3 h-3" />
              <span>{project.duration || 0}s</span>
              <span>•</span>
              <span>{project.scenes?.[0]?.count || 0} scenes</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                View
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1" 
                onClick={() => handleProjectDownload(project.video_url, project.id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteProject(project.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
