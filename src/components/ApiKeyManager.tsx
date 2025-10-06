import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Copy, Eye, EyeOff, Key, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
}

export const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-api-key", {
        body: { name: newKeyName },
      });

      if (error) throw error;

      setGeneratedKey(data.apiKey);
      setNewKeyName("");
      setShowDialog(true);
      await loadApiKeys();

      toast({
        title: "API Key Created",
        description: "Your new API key has been generated. Make sure to copy it now!",
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);

      if (error) throw error;

      await loadApiKeys();
      toast({
        title: "API Key Deleted",
        description: "The API key has been removed",
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Generate API keys to access the video generation API programmatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="API key name (e.g., Production API)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && generateApiKey()}
            />
            <Button onClick={generateApiKey}>
              <Plus className="w-4 h-4 mr-2" />
              Create Key
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <Card key={key.id} className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{key.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {key.key_preview}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Created: {new Date(key.created_at).toLocaleDateString()} • 
                          Used: {key.usage_count} times
                          {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteApiKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Copy this API key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <code className="text-sm font-mono break-all">{generatedKey}</code>
            </div>
            <Button
              onClick={() => generatedKey && copyToClipboard(generatedKey)}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>How to use the API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Endpoint:</h4>
              <code className="block p-2 bg-muted rounded">
                POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-api
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Headers:</h4>
              <code className="block p-2 bg-muted rounded whitespace-pre">
                {`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Request Body:</h4>
              <code className="block p-2 bg-muted rounded whitespace-pre">
                {`{
  "prompt": "Your video description",
  "style": "cinematic",
  "duration": 30,
  "aspectRatio": "16:9"
}`}
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Response:</h4>
              <code className="block p-2 bg-muted rounded whitespace-pre">
                {`{
  "projectId": "uuid",
  "status": "processing"
}`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};