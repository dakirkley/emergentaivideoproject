import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import Layout from "../components/Layout";
import FileUpload from "../components/FileUpload";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Video, Loader2, Download, Sparkles, User, Move } from "lucide-react";

export default function VideoGeneration() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("kling");
  const [model, setModel] = useState("kling/v2-1-standard");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedAudio, setUploadedAudio] = useState(null);
  const [uploadedRefVideo, setUploadedRefVideo] = useState(null);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [characterOrientation, setCharacterOrientation] = useState("image");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [pollingId, setPollingId] = useState(null);
  const [apiKeysStatus, setApiKeysStatus] = useState(null);
  const [sourceImageFromGen, setSourceImageFromGen] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const res = await axios.get(`${API}/settings/api-keys`, { withCredentials: true });
        setApiKeysStatus(res.data);
      } catch (error) {
        console.error("Error fetching API keys:", error);
      }
    };
    loadApiKeys();
    
    // Check for prompt from template navigation
    if (location.state?.prompt) {
      setPrompt(location.state.prompt);
    }
    
    // Check for source image from Image Generation
    if (location.state?.sourceImage) {
      const { url, prompt: imgPrompt, fromImageGeneration } = location.state.sourceImage;
      setSourceImageFromGen({ url, prompt: imgPrompt });
      setUploadedImage({ url, name: "Generated Image", type: "image/png" });
      if (imgPrompt && !location.state?.prompt) {
        setPrompt(imgPrompt);
      }
      // Show a toast notification
      if (fromImageGeneration) {
        toast.success("Image loaded! Ready to create video.");
      }
    }
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [location.state]);

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
      const finalImageUrl = uploadedImage?.url || imageUrl || undefined;
      
      const response = await axios.post(
        `${API}/generate/video`,
        {
          prompt,
          provider,
          model: provider === "kling" ? model : undefined,
          duration: parseInt(duration),
          aspect_ratio: aspectRatio,
          image_url: finalImageUrl,
          negative_prompt: negativePrompt || undefined
        },
        { withCredentials: true }
      );

      if (response.data.status === "processing" && provider === "kling") {
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

  const handleAvatarGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!apiKeysStatus?.has_kling_key) {
      toast.error("Please configure your Kling AI API key in Settings");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      
      if (uploadedImage?.url) {
        formData.append("avatar_image_url", uploadedImage.url);
      }
      if (uploadedAudio?.url) {
        formData.append("audio_url", uploadedAudio.url);
      }

      const response = await axios.post(
        `${API}/generate/video/avatar`,
        formData,
        { 
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      if (response.data.status === "processing") {
        setPollingId(response.data.generation_id);
        startPolling(response.data.generation_id);
        toast.info("Avatar video generation started. This may take a few minutes...");
      } else {
        setResult(response.data);
        setLoading(false);
        toast.success("Avatar video generated successfully!");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to generate avatar video";
      toast.error(message);
      setLoading(false);
    }
  };

  const handleMotionControlGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!uploadedImage) {
      toast.error("Please upload a source image");
      return;
    }

    if (!uploadedRefVideo) {
      toast.error("Please upload a reference video");
      return;
    }

    if (!apiKeysStatus?.has_kling_key) {
      toast.error("Please configure your Kling AI API key in Settings");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("image_url", uploadedImage.url);
      formData.append("reference_video_url", uploadedRefVideo.url);
      formData.append("character_orientation", characterOrientation);

      const response = await axios.post(
        `${API}/generate/video/motion-control`,
        formData,
        { 
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      if (response.data.status === "processing") {
        setPollingId(response.data.generation_id);
        startPolling(response.data.generation_id);
        toast.info("Motion control video generation started. This may take a few minutes...");
      } else {
        setResult(response.data);
        setLoading(false);
        toast.success("Motion control video generated successfully!");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to generate motion control video";
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
    }, 5000);
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
            Create AI videos from text, images, or with motion control
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="text-to-video" data-testid="tab-text-to-video">
              <Video className="w-4 h-4 mr-2" />
              Text/Image
            </TabsTrigger>
            <TabsTrigger value="avatar" data-testid="tab-avatar">
              <User className="w-4 h-4 mr-2" />
              Avatar
            </TabsTrigger>
            <TabsTrigger value="motion-control" data-testid="tab-motion-control">
              <Move className="w-4 h-4 mr-2" />
              Motion
            </TabsTrigger>
          </TabsList>

          {/* Text-to-Video / Image-to-Video Tab */}
          <TabsContent value="text-to-video">
            <div className="grid lg:grid-cols-2 gap-8 mt-6">
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
                      <Label>Duration</Label>
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

                  {/* Image Upload for Image-to-Video */}
                  <div className="space-y-2">
                    <Label>Source Image (optional - for Image-to-Video)</Label>
                    
                    {/* Show loaded image from Image Generation */}
                    {sourceImageFromGen && uploadedImage ? (
                      <Card className="p-4 border-blue-500/50 bg-blue-500/5">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                            <img 
                              src={sourceImageFromGen.url} 
                              alt="Source" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                                From Image Generation
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {sourceImageFromGen.prompt || "Generated image"}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSourceImageFromGen(null);
                                setUploadedImage(null);
                              }}
                              className="text-xs mt-1 h-auto p-0 text-muted-foreground hover:text-foreground"
                            >
                              Clear and upload different image
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <>
                        <FileUpload
                          accept="image/*"
                          label="Upload Image"
                          description="Drop an image or click to upload"
                          onUpload={(data) => setUploadedImage(data)}
                        />
                        {!uploadedImage && (
                          <div className="mt-2">
                            <Label className="text-xs text-muted-foreground">Or enter image URL</Label>
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              className="mt-1"
                              data-testid="image-url-input"
                            />
                          </div>
                        )}
                      </>
                    )}
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
              <ResultPanel result={result} loading={loading} pollingId={pollingId} onDownload={handleDownload} />
            </div>
          </TabsContent>

          {/* Avatar Tab */}
          <TabsContent value="avatar">
            <div className="grid lg:grid-cols-2 gap-8 mt-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground">
                      <strong>Kling AI Avatar</strong> creates talking head videos from a portrait image and audio/text input.
                    </p>
                  </div>

                  {!apiKeysStatus?.has_kling_key && (
                    <p className="text-xs text-orange-500">
                      Kling AI API key not configured. <a href="/settings" className="underline">Configure in Settings</a>
                    </p>
                  )}

                  {/* Avatar Image Upload */}
                  <div className="space-y-2">
                    <Label>Avatar Image</Label>
                    <FileUpload
                      accept="image/*"
                      label="Upload Portrait"
                      description="Upload a clear portrait photo"
                      onUpload={(data) => setUploadedImage(data)}
                    />
                  </div>

                  {/* Audio Upload (optional) */}
                  <div className="space-y-2">
                    <Label>Audio (optional)</Label>
                    <FileUpload
                      accept="audio/*"
                      label="Upload Audio"
                      description="Upload audio for lip sync"
                      onUpload={(data) => setUploadedAudio(data)}
                    />
                  </div>

                  {/* Prompt */}
                  <div className="space-y-2">
                    <Label>Prompt / Script</Label>
                    <Textarea
                      placeholder="Enter the script or describe the avatar's actions..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="resize-none"
                      data-testid="avatar-prompt-input"
                    />
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleAvatarGenerate}
                    disabled={loading || !apiKeysStatus?.has_kling_key}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                    data-testid="generate-avatar-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {pollingId ? "Processing..." : "Starting..."}
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />
                        Generate Avatar Video
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Result Panel */}
              <ResultPanel result={result} loading={loading} pollingId={pollingId} onDownload={handleDownload} />
            </div>
          </TabsContent>

          {/* Motion Control Tab */}
          <TabsContent value="motion-control">
            <div className="grid lg:grid-cols-2 gap-8 mt-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-secondary/50">
                    <p className="text-sm text-muted-foreground">
                      <strong>Motion Control</strong> transfers motion from a reference video to your image. Upload a source image and a reference video with the motion you want to apply.
                    </p>
                  </div>

                  {!apiKeysStatus?.has_kling_key && (
                    <p className="text-xs text-orange-500">
                      Kling AI API key not configured. <a href="/settings" className="underline">Configure in Settings</a>
                    </p>
                  )}

                  {/* Source Image Upload */}
                  <div className="space-y-2">
                    <Label>Source Image *</Label>
                    <FileUpload
                      accept="image/*"
                      label="Upload Source Image"
                      description="The image to animate"
                      onUpload={(data) => setUploadedImage(data)}
                    />
                  </div>

                  {/* Reference Video Upload */}
                  <div className="space-y-2">
                    <Label>Reference Video *</Label>
                    <FileUpload
                      accept="video/*"
                      label="Upload Reference Video"
                      description="Video with the motion to transfer"
                      onUpload={(data) => setUploadedRefVideo(data)}
                    />
                  </div>

                  {/* Character Orientation */}
                  <div className="space-y-2">
                    <Label>Character Orientation</Label>
                    <Select value={characterOrientation} onValueChange={setCharacterOrientation}>
                      <SelectTrigger data-testid="orientation-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Follow Image</SelectItem>
                        <SelectItem value="video">Follow Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prompt */}
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      placeholder="Describe the desired output..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      className="resize-none"
                      data-testid="motion-prompt-input"
                    />
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleMotionControlGenerate}
                    disabled={loading || !apiKeysStatus?.has_kling_key || !uploadedImage || !uploadedRefVideo}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                    data-testid="generate-motion-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {pollingId ? "Processing..." : "Starting..."}
                      </>
                    ) : (
                      <>
                        <Move className="w-4 h-4 mr-2" />
                        Generate Motion Video
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Result Panel */}
              <ResultPanel result={result} loading={loading} pollingId={pollingId} onDownload={handleDownload} />
            </div>
          </TabsContent>
        </Tabs>

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

// Result Panel Component
function ResultPanel({ result, loading, pollingId, onDownload }) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">Result</h3>
          {result?.result_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
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
  );
}
