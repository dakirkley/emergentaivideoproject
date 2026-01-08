import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Image, Loader2, Download, RefreshCw, Sparkles, Video, ArrowRight } from "lucide-react";

export default function ImageGeneration() {
  const location = useLocation();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("openai");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiKeysStatus, setApiKeysStatus] = useState(null);

  useEffect(() => {
    fetchApiKeys();
    // Check for prompt from template navigation
    if (location.state?.prompt) {
      setPrompt(location.state.prompt);
    }
  }, [location.state]);

  const fetchApiKeys = async () => {
    try {
      const res = await axios.get(`${API}/settings/api-keys`, { withCredentials: true });
      setApiKeysStatus(res.data);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };

  const canGenerate = () => {
    if (provider === "openai") {
      return apiKeysStatus?.use_emergent_key || apiKeysStatus?.has_openai_key;
    }
    if (provider === "fal") {
      return apiKeysStatus?.has_fal_key;
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!canGenerate()) {
      toast.error(`Please configure your ${provider === "openai" ? "OpenAI" : "Fal.ai"} API key in Settings`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `${API}/generate/image`,
        { prompt, provider },
        { withCredentials: true }
      );
      
      setResult(response.data);
      toast.success("Image generated successfully!");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to generate image";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.result_url) return;

    try {
      const response = await fetch(result.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `creati-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded!");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const handleCreateVideo = () => {
    if (!result?.result_url) return;
    
    // Navigate to video generation with the image
    navigate("/generate/video", {
      state: {
        sourceImage: {
          url: result.result_url,
          prompt: prompt,
          fromImageGeneration: true
        }
      }
    });
    
    toast.success("Image transferred to Video Generation!");
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
            Image Generation
          </h1>
          <p className="text-muted-foreground mt-1">
            Create stunning images with AI
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <Card className="p-6">
            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger data-testid="provider-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">
                      OpenAI {apiKeysStatus?.use_emergent_key && "(Emergent Key)"}
                    </SelectItem>
                    <SelectItem value="fal">Fal.ai (FLUX)</SelectItem>
                  </SelectContent>
                </Select>
                {!canGenerate() && (
                  <p className="text-xs text-orange-500">
                    API key not configured. <a href="/settings" className="underline">Configure in Settings</a>
                  </p>
                )}
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  placeholder="Describe the image you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="resize-none"
                  data-testid="image-prompt-input"
                />
                <p className="text-xs text-muted-foreground">
                  Be descriptive for better results. Include style, mood, and details.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={loading || !canGenerate()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                data-testid="generate-image-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Result Panel */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg">Result</h3>
                {result?.result_url && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResult(null);
                        handleGenerate();
                      }}
                      className="rounded-full"
                      data-testid="regenerate-btn"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      className="rounded-full"
                      data-testid="download-btn"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>

              <div className="aspect-square rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
                    <p className="text-muted-foreground">Creating your image...</p>
                  </motion.div>
                ) : result?.result_url ? (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={result.result_url}
                    alt="Generated image"
                    className="w-full h-full object-contain"
                    data-testid="generated-image"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Image className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Your generated image will appear here</p>
                  </div>
                )}
              </div>

              {/* Create Video Button */}
              {result?.result_url && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-2"
                >
                  <Button
                    onClick={handleCreateVideo}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full"
                    data-testid="create-video-btn"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Create Video from This Image
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Use this image as the starting frame for video generation
                  </p>
                </motion.div>
              )}
            </div>
          </Card>
        </div>

        {/* Tips */}
        <Card className="p-6">
          <h3 className="font-heading font-bold text-lg mb-4">Tips for Better Results</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Be Specific", desc: "Include details about style, lighting, and composition" },
              { title: "Use Art Styles", desc: "Reference art movements like 'impressionist' or 'cyberpunk'" },
              { title: "Describe Mood", desc: "Add emotional qualities like 'serene' or 'dramatic'" },
              { title: "Technical Terms", desc: "Use terms like 'bokeh', '8k resolution', 'detailed'" }
            ].map((tip, i) => (
              <div key={i} className="p-4 rounded-xl bg-secondary/50">
                <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                <p className="text-xs text-muted-foreground">{tip.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
