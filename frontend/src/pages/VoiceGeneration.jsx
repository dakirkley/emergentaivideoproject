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
import { Mic, Loader2, Download, Play, Pause, Sparkles, Volume2 } from "lucide-react";

export default function VoiceGeneration() {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState("elevenlabs");
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [apiKeysStatus, setApiKeysStatus] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await axios.get(`${API}/settings/api-keys`, { withCredentials: true });
      setApiKeysStatus(res.data);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };

  const canGenerate = () => {
    if (provider === "elevenlabs") return apiKeysStatus?.has_elevenlabs_key;
    if (provider === "fal") return apiKeysStatus?.has_fal_key;
    return false;
  };

  const defaultVoices = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Female)" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Female)" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Female)" },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Male)" },
    { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Female)" },
    { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Male)" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Arnold (Male)" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Male)" },
    { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam (Male)" },
  ];

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter text to convert to speech");
      return;
    }

    if (!canGenerate()) {
      toast.error(`Please configure your ${provider === "elevenlabs" ? "ElevenLabs" : "Fal.ai"} API key in Settings`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(
        `${API}/generate/voice`,
        {
          prompt: text,
          provider,
          voice_id: provider === "elevenlabs" ? voiceId : undefined
        },
        { withCredentials: true }
      );

      setResult(response.data);
      toast.success("Voice generated successfully!");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to generate voice";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    if (!result?.result_url) return;

    try {
      const a = document.createElement("a");
      a.href = result.result_url;
      a.download = `creati-voice-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Audio downloaded!");
    } catch (error) {
      toast.error("Failed to download audio");
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
            Voice Generation
          </h1>
          <p className="text-muted-foreground mt-1">
            Convert text to natural-sounding speech
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
                  <SelectTrigger data-testid="voice-provider-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="fal">Fal.ai (F5-TTS)</SelectItem>
                  </SelectContent>
                </Select>
                {!canGenerate() && (
                  <p className="text-xs text-orange-500">
                    API key not configured. <a href="/settings" className="underline">Configure in Settings</a>
                  </p>
                )}
              </div>

              {/* Voice Selection (ElevenLabs only) */}
              {provider === "elevenlabs" && (
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger data-testid="voice-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Text Input */}
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea
                  placeholder="Enter the text you want to convert to speech..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  className="resize-none"
                  data-testid="voice-text-input"
                />
                <p className="text-xs text-muted-foreground">
                  {text.length} characters
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={loading || !canGenerate()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                data-testid="generate-voice-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Voice
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
                    data-testid="download-voice-btn"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
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
                    <p className="text-muted-foreground">Generating voice...</p>
                  </motion.div>
                ) : result?.result_url ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6 p-8"
                  >
                    {/* Audio Visualizer Placeholder */}
                    <div className="relative w-32 h-32">
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 ${isPlaying ? 'animate-pulse' : ''}`} />
                      <button
                        onClick={togglePlayback}
                        className="absolute inset-0 flex items-center justify-center"
                        data-testid="play-pause-btn"
                      >
                        {isPlaying ? (
                          <Pause className="w-12 h-12 text-white" />
                        ) : (
                          <Play className="w-12 h-12 text-white ml-2" />
                        )}
                      </button>
                    </div>
                    
                    <audio
                      ref={audioRef}
                      src={result.result_url}
                      onEnded={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      Click to {isPlaying ? "pause" : "play"} the generated audio
                    </p>
                  </motion.div>
                ) : (
                  <div className="text-center p-8">
                    <Volume2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Your generated audio will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Tips */}
        <Card className="p-6">
          <h3 className="font-heading font-bold text-lg mb-4">Voice Generation Tips</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Punctuation", desc: "Use commas and periods for natural pauses" },
              { title: "Emphasis", desc: "CAPITALIZE words for emphasis in speech" },
              { title: "Numbers", desc: "Write numbers as words for better pronunciation" },
              { title: "Pacing", desc: "Use '...' for longer pauses in speech" }
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
