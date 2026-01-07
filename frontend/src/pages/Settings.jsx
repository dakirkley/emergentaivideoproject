import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API, useAuth } from "../App";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Key, User, Sparkles, Check, Eye, EyeOff, Loader2, ExternalLink, LogOut } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  
  const [apiKeys, setApiKeys] = useState({
    kling_api_key: "",
    fal_api_key: "",
    elevenlabs_api_key: "",
    openai_api_key: "",
    use_emergent_key: true
  });
  
  const [originalKeys, setOriginalKeys] = useState({});

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await axios.get(`${API}/settings/api-keys`, { withCredentials: true });
      const data = res.data;
      setApiKeys({
        kling_api_key: data.kling_api_key || "",
        fal_api_key: data.fal_api_key || "",
        elevenlabs_api_key: data.elevenlabs_api_key || "",
        openai_api_key: data.openai_api_key || "",
        use_emergent_key: data.use_emergent_key ?? true
      });
      setOriginalKeys(data);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only send keys that have changed (not masked values)
      const updateData = {};
      
      if (apiKeys.kling_api_key && !apiKeys.kling_api_key.includes("****")) {
        updateData.kling_api_key = apiKeys.kling_api_key;
      }
      if (apiKeys.fal_api_key && !apiKeys.fal_api_key.includes("****")) {
        updateData.fal_api_key = apiKeys.fal_api_key;
      }
      if (apiKeys.elevenlabs_api_key && !apiKeys.elevenlabs_api_key.includes("****")) {
        updateData.elevenlabs_api_key = apiKeys.elevenlabs_api_key;
      }
      if (apiKeys.openai_api_key && !apiKeys.openai_api_key.includes("****")) {
        updateData.openai_api_key = apiKeys.openai_api_key;
      }
      
      updateData.use_emergent_key = apiKeys.use_emergent_key;

      await axios.put(`${API}/settings/api-keys`, updateData, { withCredentials: true });
      toast.success("Settings saved successfully!");
      fetchApiKeys(); // Refresh to get masked keys
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async (keyName) => {
    try {
      await axios.put(`${API}/settings/api-keys`, { [keyName]: "" }, { withCredentials: true });
      setApiKeys(prev => ({ ...prev, [keyName]: "" }));
      toast.success("API key cleared");
    } catch (error) {
      toast.error("Failed to clear API key");
    }
  };

  const apiKeyFields = [
    {
      key: "kling_api_key",
      label: "Kling AI API Key",
      description: "For video generation with Kling AI",
      link: "https://app.klingai.com/global/dev/document-api/quickStart/userManual",
      placeholder: "Enter your Kling AI API key"
    },
    {
      key: "fal_api_key",
      label: "Fal.ai API Key",
      description: "For image and video generation with Fal.ai",
      link: "https://fal.ai/dashboard/keys",
      placeholder: "Enter your Fal.ai API key"
    },
    {
      key: "elevenlabs_api_key",
      label: "ElevenLabs API Key",
      description: "For voice generation with ElevenLabs",
      link: "https://elevenlabs.io/app/settings/api-keys",
      placeholder: "Enter your ElevenLabs API key"
    }
  ];

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and API keys
          </p>
        </div>

        {/* Profile Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-orange-500" />
            <h2 className="font-heading font-bold text-xl">Profile</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user?.picture} />
              <AvatarFallback className="bg-orange-500 text-white text-lg">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-lg">{user?.name}</p>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* OpenAI Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="font-heading font-bold text-xl">OpenAI Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Emergent Key Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
              <div className="space-y-1">
                <p className="font-medium">Use Emergent Universal Key</p>
                <p className="text-sm text-muted-foreground">
                  Use the built-in API key (credits deducted from your balance)
                </p>
              </div>
              <Switch
                checked={apiKeys.use_emergent_key}
                onCheckedChange={(checked) => setApiKeys(prev => ({ ...prev, use_emergent_key: checked }))}
                data-testid="emergent-key-toggle"
              />
            </div>

            {/* Custom OpenAI Key */}
            {!apiKeys.use_emergent_key && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label>OpenAI API Key</Label>
                <div className="relative">
                  <Input
                    type={showKeys.openai_api_key ? "text" : "password"}
                    value={apiKeys.openai_api_key}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai_api_key: e.target.value }))}
                    placeholder="sk-..."
                    className="pr-10 font-mono"
                    data-testid="openai-key-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, openai_api_key: !prev.openai_api_key }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKeys.openai_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-orange-500 hover:underline"
                >
                  Get your API key <ExternalLink className="w-3 h-3" />
                </a>
              </motion.div>
            )}
          </div>
        </Card>

        {/* API Keys Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Key className="w-5 h-5 text-orange-500" />
            <h2 className="font-heading font-bold text-xl">API Keys</h2>
          </div>

          <div className="space-y-6">
            {apiKeyFields.map((field, index) => (
              <div key={field.key}>
                {index > 0 && <Separator className="my-6" />}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{field.label}</Label>
                    {originalKeys[`has_${field.key.replace('_api_key', '')}_key`] && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-500">
                        <Check className="w-3 h-3" /> Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
                  <div className="relative">
                    <Input
                      type={showKeys[field.key] ? "text" : "password"}
                      value={apiKeys[field.key]}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="pr-20 font-mono"
                      data-testid={`${field.key}-input`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showKeys[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <a
                      href={field.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-orange-500 hover:underline"
                    >
                      Get your API key <ExternalLink className="w-3 h-3" />
                    </a>
                    {originalKeys[`has_${field.key.replace('_api_key', '')}_key`] && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs text-destructive">
                            Clear Key
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear API Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove your {field.label}. You will need to enter it again to use this service.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleClearKey(field.key)}>
                              Clear Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8"
              data-testid="save-settings-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Logout Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-full text-destructive" data-testid="logout-settings-btn">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign Out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to sign out of your account?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={logout}>Sign Out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
