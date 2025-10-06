import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, CreditCard, Crown, Key } from "lucide-react";
import { ApiKeyManager } from "@/components/ApiKeyManager";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
    });
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully."
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6 hover-scale"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Studio
        </Button>

        <h1 className="text-4xl font-bold mb-2 bg-gradient-creative bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground mb-8">
          Manage your account preferences and subscription
        </p>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="api">API Access</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Settings */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50 animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={user?.email || ""} 
                    disabled 
                    className="bg-muted/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={isLoading}
                  className="bg-gradient-primary hover:opacity-90 transition-all duration-300"
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="backdrop-blur-sm bg-card/50 border-destructive/50 animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="hover-scale">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            {/* Subscription Info */}
            <Card className="backdrop-blur-sm bg-card/50 border-border/50 animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Subscription
                </CardTitle>
                <CardDescription>
                  Your current plan and credits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Current Plan</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {profile?.subscription_tier || "free"}
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/plans")}
                    className="hover-scale"
                  >
                    Upgrade
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Available Credits
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {profile?.credits || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <ApiKeyManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
