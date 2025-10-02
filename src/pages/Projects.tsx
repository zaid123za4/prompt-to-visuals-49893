import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProjectList } from "@/components/ProjectList";

export default function Projects() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
    setLoading(false);
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      <Navbar />
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-creative bg-clip-text text-transparent">
          My Projects
        </h1>
        <ProjectList />
      </div>
    </div>
  );
}