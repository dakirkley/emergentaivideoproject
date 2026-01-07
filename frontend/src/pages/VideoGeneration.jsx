import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Video, Loader2, Download, RefreshCw, Sparkles, Upload, X, Play } from "lucide-react";

export default function VideoGeneration() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("kling");
  const [model, setModel] = useState("kling/v2-1-standard");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageUrl, setImageUrl] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [pollingId, setPollingId] = useState(null);
  const [apiKeysStatus, setApiKeysStatus] = useState(null);
  const pollingRef = useRef(null);

  const fetchApiKeys = async () => {
    try {
      const res = await axios.get(`${API}/settings/api-keys`, { withCredentials: true });
      setApiKeysStatus(res.data);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };

  useEffect(() => {
    fetchApiKeys();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const canGenerate = () => {
    if (provider === "kling") return apiKeysStatus?.has_kling_key;
    if (provider === "fal") return apiKeysStatus?.has_fal_key;
    return false;
  };

  const klingModels = [
    { value: "kling/v2-1-standard", label: "Kling v2.1 Standard" },
    { value: "kling/v2-1-master", label: "Kling v2.1 Master (Higher Quality)" },
    { value: "kling/v2-0-standard", label: "Kling v2.0 Standard" },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!canGenerate()) {
      toast.error(`Please configure your ${provider === "kling" ? "Kling AI" : "Fal.ai"} API key in Settings`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `${API}/generate/video`,
        {
          prompt,
          provider,
          model: provider === "kling" ? model : undefined,
          duration: parseInt(duration),
          aspect_ratio: aspectRatio,
          image_url: imageUrl || undefined,
          negative_prompt: negativePrompt || undefined
        },
        { withCredentials: true }
      );

      if (response.data.status === "processing" && provider === "kling") {
        // Start polling for Kling AI
        setPollingId(response.data.generation_id);
        startPolling(response.data.generation_id);
        toast.info("Video generation started. This may take a few minutes...");
      } else {
        setResult(response.data);
        setLoading(false);
        toast.success("Video generated successfully!");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to generate video";
      toast.error(message);
      setLoading(false);
    }
  };

  const startPolling = (generationId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(
          `${API}/generate/video/status/${generationId}`,
          { withCredentials: true }
        );

        if (res.data.status === "completed") {
          clearInterval(pollingRef.current);
          setResult(res.data);
          setLoading(false);
          toast.success("Video generated successfully!");
        } else if (res.data.status === "failed") {
          clearInterval(pollingRef.current);
          setLoading(false);
          toast.error(res.data.error_message || "Video generation failed");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleDownload = async () => {
    if (!result?.result_url) return;

    try {
      const response = await fetch(result.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `creati-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Video downloaded!");
    } catch (error) {
      toast.error("Failed to download video");
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
            Video Generation
          </h1>
          <p className="text-muted-foreground mt-1">
            Create AI videos from text or images
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
                  <SelectTrigger data-testid="video-provider-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kling">Kling AI</SelectItem>
                    <SelectItem value="fal">Fal.ai</SelectItem>
                  </SelectContent>
                </Select>
                {!canGenerate() && (
                  <p className="text-xs text-orange-500">
                    API key not configured. <a href="/settings" className="underline">Configure in Settings</a>
                  </p>
                )}
              </div>

              {/* Model Selection (Kling only) */}
              {provider === "kling" && (
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger data-testid="video-model-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {klingModels.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Duration & Aspect Ratio */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger data-testid="duration-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger data-testid="aspect-ratio-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image URL (optional) */}
              <div className="space-y-2">
                <Label>Image URL (optional - for Image-to-Video)</Label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  data-testid="image-url-input"
                />
                <p className="text-xs text-muted-foreground">
                  Provide an image URL to create video from image
                </p>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  placeholder="Describe the video you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                  data-testid="video-prompt-input"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-2">
                <Label>Negative Prompt (optional)</Label>
                <Input
                  placeholder="blur, distort, low quality..."
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  data-testid="negative-prompt-input"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={loading || !canGenerate()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                data-testid="generate-video-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {pollingId ? "Processing..." : "Starting..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Video
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="rounded-full"
                    data-testid="download-video-btn"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                )}
              </div>

              <div className="aspect-video rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-muted-foreground">Creating your video...</p>
                      <p className="text-xs text-muted-foreground mt-1">This may take 2-5 minutes</p>
                    </div>
                  </motion.div>
                ) : result?.result_url ? (
                  <motion.video
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={result.result_url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                    data-testid="generated-video"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Your generated video will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Tips */}
        <Card className="p-6">
          <h3 className="font-heading font-bold text-lg mb-4">Video Generation Tips</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Camera Movement", desc: "Include terms like 'tracking shot', 'zoom in', 'pan left'" },
              { title: "Motion Description", desc: "Describe how objects move: 'slowly walking', 'wind blowing'" },
              { title: "Lighting", desc: "Specify lighting conditions: 'golden hour', 'neon lights'" },
              { title: "Style Reference", desc: "Mention styles: 'cinematic', 'documentary', 'anime'" }
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
