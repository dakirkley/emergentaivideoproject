import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Image as ImageIcon, 
  Music, 
  Upload, 
  Trash2,
  Save,
  Loader2,
  Play,
  Pause
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";

export default function SceneDetailPanel({
  scene,
  storyboardId,
  onClose,
  onUpdate,
  onUploadMedia
}) {
  const [title, setTitle] = useState(scene.title);
  const [script, setScript] = useState(scene.script || "");
  const [notes, setNotes] = useState(scene.notes || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ image: false, audio: false });
  const [isPlaying, setIsPlaying] = useState(false);
  
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const audioRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(scene.scene_id, { title, script, notes });
    setSaving(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(prev => ({ ...prev, image: true }));
    await onUploadMedia(scene.scene_id, "image", file);
    setUploading(prev => ({ ...prev, image: false }));
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(prev => ({ ...prev, audio: true }));
    await onUploadMedia(scene.scene_id, "audio", file);
    setUploading(prev => ({ ...prev, audio: false }));
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full"
    >
      <div className="w-[400px] h-full bg-card rounded-2xl border border-border/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="font-heading font-semibold">Scene Details</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8"
            data-testid="close-detail-panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="scene-title">Scene Title</Label>
            <Input
              id="scene-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter scene title..."
              className="bg-secondary/50"
              data-testid="scene-title-input"
            />
          </div>

          <Separator />

          {/* Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                Scene Image
              </Label>
              {scene.image && (
                <Badge variant="secondary" className="text-xs">
                  Uploaded
                </Badge>
              )}
            </div>
            
            {scene.image?.url ? (
              <div className="relative group rounded-lg overflow-hidden">
                <img
                  src={scene.image.url}
                  alt="Scene"
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Replace
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-border/50 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-orange-500"
                disabled={uploading.image}
                data-testid="upload-image-btn"
              >
                {uploading.image ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Upload Image</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <Separator />

          {/* Script */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="scene-script">Script / Dialogue</Label>
              <span className="text-xs text-muted-foreground">
                {wordCount} words
              </span>
            </div>
            <Textarea
              id="scene-script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Write the script for this scene..."
              className="bg-secondary/50 min-h-[120px] resize-none"
              data-testid="scene-script-input"
            />
          </div>

          <Separator />

          {/* Audio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Music className="w-4 h-4 text-orange-500" />
                Audio / Voice
              </Label>
              {scene.audio && (
                <Badge variant="secondary" className="text-xs">
                  Uploaded
                </Badge>
              )}
            </div>
            
            {scene.audio?.url ? (
              <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">
                    {scene.audio.filename || "Audio file"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={toggleAudioPlayback}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => audioInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <audio
                  ref={audioRef}
                  src={scene.audio.url}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            ) : (
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full p-4 rounded-lg border-2 border-dashed border-border/50 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-orange-500"
                disabled={uploading.audio}
                data-testid="upload-audio-btn"
              >
                {uploading.audio ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Upload Audio</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="scene-notes">Director Notes</Label>
            <Textarea
              id="scene-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add production notes, camera directions, mood..."
              className="bg-secondary/50 min-h-[80px] resize-none"
              data-testid="scene-notes-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
            data-testid="save-scene-btn"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
