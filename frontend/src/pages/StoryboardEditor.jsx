import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Image,
  Music,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  X,
  Upload,
  Clock,
  FileText,
  Clapperboard,
  Check,
  Undo2,
  Play
} from "lucide-react";

export default function StoryboardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [storyboard, setStoryboard] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeScene, setActiveScene] = useState(null);
  const [showDeleteSceneDialog, setShowDeleteSceneDialog] = useState(null);
  const [deletedScene, setDeletedScene] = useState(null); // For undo
  const timelineRef = useRef(null);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    fetchStoryboard();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [id]);

  const fetchStoryboard = async () => {
    try {
      const res = await axios.get(`${API}/storyboards/${id}`, { withCredentials: true });
      setStoryboard(res.data.storyboard);
      setScenes(res.data.storyboard.scenes || []);
    } catch (error) {
      console.error("Error fetching storyboard:", error);
      toast.error("Failed to load storyboard");
      navigate("/storyboards");
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      // Auto-save logic handled per-scene
    }, 2000);
  }, []);

  const updateStoryboardTitle = async (title) => {
    try {
      await axios.put(`${API}/storyboards/${id}`, { title }, { withCredentials: true });
      setStoryboard(prev => ({ ...prev, title }));
    } catch (error) {
      toast.error("Failed to update title");
    }
  };

  const addScene = async () => {
    try {
      const sceneNumber = scenes.length + 1;
      const res = await axios.post(`${API}/storyboards/${id}/scenes`, {
        title: `Scene ${sceneNumber}`,
        script: ""
      }, { withCredentials: true });
      
      setScenes(prev => [...prev, res.data.scene]);
      toast.success("Scene ready.");
      
      // Scroll to new scene
      setTimeout(() => {
        if (timelineRef.current) {
          timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
        }
      }, 100);
    } catch (error) {
      toast.error("Failed to add scene");
    }
  };

  const updateScene = async (sceneId, data) => {
    try {
      await axios.put(`${API}/storyboards/${id}/scenes/${sceneId}`, data, { withCredentials: true });
      setScenes(prev => prev.map(s => 
        s.scene_id === sceneId ? { ...s, ...data } : s
      ));
      
      if (activeScene?.scene_id === sceneId) {
        setActiveScene(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      toast.error("Failed to update scene");
    }
  };

  const deleteScene = async (sceneId) => {
    const sceneToDelete = scenes.find(s => s.scene_id === sceneId);
    
    try {
      await axios.delete(`${API}/storyboards/${id}/scenes/${sceneId}`, { withCredentials: true });
      setScenes(prev => prev.filter(s => s.scene_id !== sceneId));
      setShowDeleteSceneDialog(null);
      setActiveScene(null);
      
      // Store for undo
      setDeletedScene(sceneToDelete);
      toast("Scene deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreScene(sceneToDelete)
        }
      });
    } catch (error) {
      toast.error("Failed to delete scene");
    }
  };

  const restoreScene = async (scene) => {
    try {
      const res = await axios.post(`${API}/storyboards/${id}/scenes`, {
        title: scene.title,
        script: scene.script,
        notes: scene.notes
      }, { withCredentials: true });
      
      setScenes(prev => [...prev, res.data.scene]);
      setDeletedScene(null);
      toast.success("Scene restored");
    } catch (error) {
      toast.error("Failed to restore scene");
    }
  };

  const handleReorder = async (newOrder) => {
    setScenes(newOrder);
    
    try {
      await axios.put(`${API}/storyboards/${id}/scenes/reorder`, {
        scene_ids: newOrder.map(s => s.scene_id)
      }, { withCredentials: true });
    } catch (error) {
      toast.error("Failed to reorder scenes");
      fetchStoryboard(); // Restore original order
    }
  };

  const uploadMedia = async (sceneId, file, mediaType) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("media_type", mediaType);

    try {
      setSaving(true);
      const res = await axios.post(
        `${API}/storyboards/${id}/scenes/${sceneId}/media`,
        formData,
        { 
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );
      
      setScenes(prev => prev.map(s => 
        s.scene_id === sceneId ? { ...s, [mediaType]: res.data.media } : s
      ));
      
      if (activeScene?.scene_id === sceneId) {
        setActiveScene(prev => ({ ...prev, [mediaType]: res.data.media }));
      }
      
      toast.success(`${mediaType === "image" ? "Visual" : "Audio"} attached.`);
    } catch (error) {
      toast.error(`Failed to upload ${mediaType}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteMedia = async (sceneId, mediaType) => {
    try {
      await axios.delete(
        `${API}/storyboards/${id}/scenes/${sceneId}/media/${mediaType}`,
        { withCredentials: true }
      );
      
      setScenes(prev => prev.map(s => 
        s.scene_id === sceneId ? { ...s, [mediaType]: null } : s
      ));
      
      if (activeScene?.scene_id === sceneId) {
        setActiveScene(prev => ({ ...prev, [mediaType]: null }));
      }
      
      toast.success("Media removed.");
    } catch (error) {
      toast.error("Failed to remove media");
    }
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
      <div className="h-[calc(100vh-7rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/storyboards")}
              className="rounded-full"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Clapperboard className="w-6 h-6 text-orange-500" />
              <Input
                value={storyboard?.title || ""}
                onChange={(e) => {
                  setStoryboard(prev => ({ ...prev, title: e.target.value }));
                }}
                onBlur={(e) => updateStoryboardTitle(e.target.value)}
                className="bg-transparent border-none text-xl font-heading font-bold focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto max-w-md"
                data-testid="storyboard-title"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
            </span>
            {saving && (
              <span className="text-sm text-orange-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 bg-secondary/30 rounded-2xl border border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              Timeline — Drag to reorder
            </p>
            <Button
              onClick={addScene}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
              data-testid="add-scene-header-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Scene
            </Button>
          </div>
          
          <div 
            ref={timelineRef}
            className="overflow-x-auto overflow-y-hidden pb-4"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="flex gap-4 min-h-[340px]">
              <Reorder.Group
                axis="x"
                values={scenes}
                onReorder={handleReorder}
                className="flex gap-4"
              >
                <AnimatePresence initial={false}>
                  {scenes.map((scene, index) => (
                    <Reorder.Item
                      key={scene.scene_id}
                      value={scene}
                      className="relative"
                      whileDrag={{ scale: 1.02, boxShadow: "0 0 30px rgba(249, 115, 22, 0.3)" }}
                    >
                      <SceneCard
                        scene={scene}
                        index={index}
                        isActive={activeScene?.scene_id === scene.scene_id}
                        onClick={() => setActiveScene(scene)}
                        onDelete={() => setShowDeleteSceneDialog(scene.scene_id)}
                        onUploadImage={(file) => uploadMedia(scene.scene_id, file, "image")}
                        onUploadAudio={(file) => uploadMedia(scene.scene_id, file, "audio")}
                      />
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>

              {/* Add Scene Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-shrink-0"
              >
                <Card
                  onClick={addScene}
                  className="w-72 h-80 border-2 border-dashed border-border/50 hover:border-orange-500/50 bg-transparent hover:bg-orange-500/5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 group"
                  data-testid="add-scene-btn"
                >
                  <div className="w-14 h-14 rounded-full bg-secondary group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">
                    <Plus className="w-7 h-7 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                    Add Scene
                  </span>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Empty State */}
          {scenes.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-xl text-muted-foreground font-heading">Drop your first scene here.</p>
                <p className="text-sm text-muted-foreground/60 mt-2">This is where the story begins.</p>
              </div>
            </div>
          )}
        </div>

      {/* Scene Detail Panel */}
      <Sheet open={!!activeScene} onOpenChange={(open) => !open && setActiveScene(null)}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-xl bg-card border-border p-0 overflow-hidden"
        >
          {activeScene && (
            <SceneDetailPanel
              scene={activeScene}
              onUpdate={(data) => updateScene(activeScene.scene_id, data)}
              onUploadImage={(file) => uploadMedia(activeScene.scene_id, file, "image")}
              onUploadAudio={(file) => uploadMedia(activeScene.scene_id, file, "audio")}
              onDeleteImage={() => deleteMedia(activeScene.scene_id, "image")}
              onDeleteAudio={() => deleteMedia(activeScene.scene_id, "audio")}
              onClose={() => setActiveScene(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Scene Confirmation */}
      <AlertDialog open={!!showDeleteSceneDialog} onOpenChange={() => setShowDeleteSceneDialog(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the scene and all attached media. You can undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScene(showDeleteSceneDialog)}
              className="bg-destructive text-destructive-foreground rounded-full"
            >
              Delete Scene
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Layout>
  );
}

// Scene Card Component
function SceneCard({ scene, index, isActive, onClick, onDelete, onUploadImage, onUploadAudio }) {
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card
        onClick={onClick}
        className={`w-72 h-80 flex-shrink-0 cursor-pointer transition-all duration-300 overflow-hidden group ${
          isActive 
            ? "ring-2 ring-orange-500 bg-zinc-800/80 scale-[1.02]" 
            : "bg-zinc-900/50 hover:bg-zinc-800/50 hover:scale-[1.01]"
        }`}
        data-testid={`scene-card-${index}`}
      >
        {/* Drag Handle */}
        <div className="absolute top-2 left-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10">
          <GripVertical className="w-4 h-4 text-zinc-500" />
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 z-10"
        >
          <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
        </button>

        {/* Image Area */}
        <div className="h-36 bg-zinc-800/50 relative overflow-hidden">
          {scene.image?.url ? (
            <img
              src={scene.image.url}
              alt={scene.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-700/30 transition-colors">
              <Image className="w-8 h-8 text-zinc-600 mb-2" />
              <span className="text-xs text-zinc-500">Drop your visuals here</span>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onUploadImage(e.target.files[0]);
                  }
                }}
              />
            </label>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col h-[calc(100%-144px)]">
          <p className="text-xs text-orange-500 uppercase tracking-wider font-medium mb-1">
            Scene {index + 1}
          </p>
          <h3 className="font-heading font-semibold text-sm truncate mb-2">
            {scene.title}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-3 flex-1">
            {scene.script || "No script yet..."}
          </p>

          {/* Audio indicator */}
          {scene.audio && (
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <Music className="w-3 h-3" />
              <span className="truncate">{scene.audio.filename}</span>
              {scene.audio.duration && (
                <span className="text-zinc-600">
                  {Math.round(scene.audio.duration)}s
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// Scene Detail Panel Component
function SceneDetailPanel({ scene, onUpdate, onUploadImage, onUploadAudio, onDeleteImage, onDeleteAudio, onClose }) {
  const [title, setTitle] = useState(scene.title);
  const [script, setScript] = useState(scene.script);
  const [notes, setNotes] = useState(scene.notes || "");
  const [hasChanges, setHasChanges] = useState(false);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    setTitle(scene.title);
    setScript(scene.script);
    setNotes(scene.notes || "");
    setHasChanges(false);
  }, [scene]);

  const handleSave = () => {
    onUpdate({ title, script, notes });
    setHasChanges(false);
    toast.success("Scene saved.");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div>
          <p className="text-xs text-orange-500 uppercase tracking-wider font-medium">Scene Details</p>
          <h2 className="font-heading font-bold text-lg mt-1">{scene.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
            >
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Image Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wider">Visual</Label>
            <div className="aspect-video rounded-lg overflow-hidden bg-zinc-800 relative group">
              {scene.image?.url ? (
                <>
                  <img
                    src={scene.image.url}
                    alt={scene.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => imageInputRef.current?.click()}
                      className="rounded-full"
                    >
                      Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onDeleteImage}
                      className="rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-700/30 transition-colors">
                  <Upload className="w-8 h-8 text-zinc-600 mb-2" />
                  <span className="text-sm text-zinc-500">Upload image</span>
                </label>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onUploadImage(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wider">Title</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasChanges(true);
              }}
              className="bg-zinc-800 border-zinc-700"
              placeholder="Scene title..."
            />
          </div>

          {/* Script */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Script
            </Label>
            <Textarea
              value={script}
              onChange={(e) => {
                setScript(e.target.value);
                setHasChanges(true);
              }}
              className="bg-zinc-800 border-zinc-700 min-h-[200px] resize-none"
              placeholder="Write your scene script here..."
            />
          </div>

          <Separator className="bg-zinc-800" />

          {/* Audio */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Music className="w-3 h-3" />
              Audio Resource
            </Label>
            {scene.audio?.url ? (
              <Card className="p-4 bg-zinc-800/50 border-zinc-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Music className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {scene.audio.filename}
                      </p>
                      {scene.audio.duration && (
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.round(scene.audio.duration)} seconds
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onDeleteAudio}
                    className="rounded-full text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <audio
                  src={scene.audio.url}
                  controls
                  className="w-full mt-3 h-8"
                />
              </Card>
            ) : (
              <label className="block">
                <Card className="p-6 bg-zinc-800/30 border-zinc-700 border-dashed cursor-pointer hover:border-orange-500/50 transition-colors">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-6 h-6 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Attach audio file</span>
                    <span className="text-xs text-zinc-600">MP3, WAV, or OGG</span>
                  </div>
                </Card>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      onUploadAudio(e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wider">Director Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setHasChanges(true);
              }}
              className="bg-zinc-800 border-zinc-700 min-h-[100px] resize-none"
              placeholder="Production notes, directions, reminders..."
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
