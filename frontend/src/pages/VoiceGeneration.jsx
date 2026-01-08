import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Mic, Loader2, Download, Play, Pause, Sparkles, Volume2, UserPlus, Trash2, Plus } from "lucide-react";

export default function VoiceGeneration() {
  const [activeTab, setActiveTab] = useState("text-to-speech");
  const [text, setText] = useState("");
  const [provider, setProvider] = useState("elevenlabs");
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [apiKeysStatus, setApiKeysStatus] = useState(null);
  const [clonedVoices, setClonedVoices] = useState([]);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [cloneAudioFiles, setCloneAudioFiles] = useState([]);
  const [cloning, setCloning] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchApiKeys();
    fetchClonedVoices();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await axios.get(`${API}/settings/api-keys`, { withCredentials: true });
      setApiKeysStatus(res.data);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };

  const fetchClonedVoices = async () => {
    try {
      const res = await axios.get(`${API}/generate/voice/cloned`, { withCredentials: true });
      setClonedVoices(res.data.voices || []);
    } catch (error) {
      console.error("Error fetching cloned voices:", error);
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

  const allVoices = [
    ...defaultVoices,
    ...clonedVoices.map(v => ({ id: v.voice_id, name: `${v.name} (Cloned)` }))
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

  const handleCloneVoice = async () => {
    if (!cloneName.trim()) {
      toast.error("Please enter a name for the cloned voice");
      return;
    }

    if (cloneAudioFiles.length === 0) {
      toast.error("Please upload at least one audio sample");
      return;
    }

    if (!apiKeysStatus?.has_elevenlabs_key) {
      toast.error("Please configure your ElevenLabs API key in Settings");
      return;
    }

    setCloning(true);

    try {
      const formData = new FormData();
      formData.append("voice_name", cloneName);
      formData.append("description", cloneDescription);
      
      // Add each audio file
      for (const audioFile of cloneAudioFiles) {
        if (audioFile.file) {
          formData.append("audio_files", audioFile.file);
        }
      }

      const response = await axios.post(
        `${API}/generate/voice/clone`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      toast.success(`Voice "${cloneName}" cloned successfully!`);
      setShowCloneDialog(false);
      setCloneName("");
      setCloneDescription("");
      setCloneAudioFiles([]);
      fetchClonedVoices();
      
      // Select the new voice
      setVoiceId(response.data.voice_id);
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to clone voice";
      toast.error(message);
    } finally {
      setCloning(false);
    }
  };

  const handleDeleteClonedVoice = async (voiceIdToDelete) => {
    try {
      await axios.delete(`${API}/generate/voice/cloned/${voiceIdToDelete}`, { withCredentials: true });
      toast.success("Voice deleted");
      fetchClonedVoices();
      
      if (voiceId === voiceIdToDelete) {
        setVoiceId("21m00Tcm4TlvDq8ikWAM");
      }
    } catch (error) {
      toast.error("Failed to delete voice");
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

  const handleAudioFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file: file
    }));
    setCloneAudioFiles(prev => [...prev, ...newFiles]);
  };

  const removeAudioFile = (id) => {
    setCloneAudioFiles(prev => prev.filter(f => f.id !== id));
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
            Convert text to natural-sounding speech or clone voices
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="text-to-speech" data-testid="tab-tts">
              <Volume2 className="w-4 h-4 mr-2" />
              Text to Speech
            </TabsTrigger>
            <TabsTrigger value="voice-cloning" data-testid="tab-cloning">
              <UserPlus className="w-4 h-4 mr-2" />
              Voice Cloning
            </TabsTrigger>
          </TabsList>

          {/* Text-to-Speech Tab */}
          <TabsContent value="text-to-speech">
            <div className="grid lg:grid-cols-2 gap-8 mt-6">
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
                      <div className="flex items-center justify-between">
                        <Label>Voice</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCloneDialog(true)}
                          className="text-orange-500"
                          data-testid="clone-voice-btn"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Clone Voice
                        </Button>
                      </div>
                      <Select value={voiceId} onValueChange={setVoiceId}>
                        <SelectTrigger data-testid="voice-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allVoices.map((voice) => (
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
          </TabsContent>

          {/* Voice Cloning Tab */}
          <TabsContent value="voice-cloning">
            <div className="mt-6 space-y-6">
              {!apiKeysStatus?.has_elevenlabs_key && (
                <Card className="p-4 border-orange-500/50 bg-orange-500/10">
                  <p className="text-sm text-orange-500">
                    ElevenLabs API key not configured. <a href="/settings" className="underline">Configure in Settings</a> to use voice cloning.
                  </p>
                </Card>
              )}

              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-bold text-xl">Your Cloned Voices</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clone a voice from audio samples to use in text-to-speech
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCloneDialog(true)}
                    disabled={!apiKeysStatus?.has_elevenlabs_key}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                    data-testid="new-clone-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Clone New Voice
                  </Button>
                </div>

                {clonedVoices.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No cloned voices yet</p>
                    <Button
                      onClick={() => setShowCloneDialog(true)}
                      disabled={!apiKeysStatus?.has_elevenlabs_key}
                      variant="outline"
                      className="rounded-full"
                    >
                      Clone Your First Voice
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clonedVoices.map((voice) => (
                      <Card key={voice.voice_id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-500/10">
                              <Mic className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-medium">{voice.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(voice.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClonedVoice(voice.voice_id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`delete-voice-${voice.voice_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {voice.description && (
                          <p className="text-xs text-muted-foreground mt-2">{voice.description}</p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3 rounded-full"
                          onClick={() => {
                            setVoiceId(voice.voice_id);
                            setActiveTab("text-to-speech");
                          }}
                        >
                          Use This Voice
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tips */}
        <Card className="p-6">
          <h3 className="font-heading font-bold text-lg mb-4">Voice Generation Tips</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Punctuation", desc: "Use commas and periods for natural pauses" },
              { title: "Emphasis", desc: "CAPITALIZE words for emphasis in speech" },
              { title: "Voice Cloning", desc: "Use 1-3 clear audio samples (30s-3min each)" },
              { title: "Audio Quality", desc: "Ensure samples have minimal background noise" }
            ].map((tip, i) => (
              <div key={i} className="p-4 rounded-xl bg-secondary/50">
                <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                <p className="text-xs text-muted-foreground">{tip.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Clone Voice Dialog */}
        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Clone a Voice</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Voice Name *</Label>
                <Input
                  placeholder="My Custom Voice"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  data-testid="clone-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="A warm, friendly voice..."
                  value={cloneDescription}
                  onChange={(e) => setCloneDescription(e.target.value)}
                  data-testid="clone-description-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Audio Samples *</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload 1-3 clear audio samples (MP3, WAV, etc). Each sample should be 30 seconds to 3 minutes.
                </p>
                
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleAudioFileUpload}
                  className="hidden"
                  id="clone-audio-input"
                />
                
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("clone-audio-input")?.click()}
                  className="w-full rounded-full"
                  data-testid="upload-samples-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Audio Samples
                </Button>

                {cloneAudioFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <AnimatePresence>
                      {cloneAudioFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary"
                        >
                          <div className="flex items-center gap-2">
                            <Mic className="w-4 h-4 text-orange-500" />
                            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAudioFile(file.id)}
                            className="h-6 w-6"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloneDialog(false)} className="rounded-full">
                Cancel
              </Button>
              <Button
                onClick={handleCloneVoice}
                disabled={cloning || !cloneName.trim() || cloneAudioFiles.length === 0}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                data-testid="submit-clone-btn"
              >
                {cloning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Clone Voice
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
