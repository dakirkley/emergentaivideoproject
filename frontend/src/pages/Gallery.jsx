import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
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
} from "../components/ui/dialog";
import { Image, Video, Mic, Trash2, Download, X, Play, Pause, Loader2, FolderOpen } from "lucide-react";

export default function Gallery() {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchGallery();
  }, [filter]);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const typeParam = filter !== "all" ? `?type=${filter}` : "";
      const res = await axios.get(`${API}/gallery${typeParam}`, { withCredentials: true });
      setGenerations(res.data.generations || []);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (generationId) => {
    try {
      await axios.delete(`${API}/gallery/${generationId}`, { withCredentials: true });
      setGenerations(prev => prev.filter(g => g.generation_id !== generationId));
      setSelectedItem(null);
      toast.success("Item deleted");
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const handleDownload = async (item) => {
    if (!item?.result_url) return;

    try {
      const response = await fetch(item.result_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = item.type === "image" ? "png" : item.type === "video" ? "mp4" : "mp3";
      a.download = `creati-${item.type}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Downloaded!");
    } catch (error) {
      toast.error("Failed to download");
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "image": return Image;
      case "video": return Video;
      case "voice": return Mic;
      default: return Image;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
              Gallery
            </h1>
            <p className="text-muted-foreground mt-1">
              Your AI-generated creations
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40" data-testid="gallery-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="voice">Voice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : generations.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl mb-2">No creations yet</h3>
            <p className="text-muted-foreground mb-6">
              Start generating images, videos, and voices to fill your gallery
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimatePresence>
              {generations.map((item, index) => {
                const Icon = getIcon(item.type);
                return (
                  <motion.div
                    key={item.generation_id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.03 }}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-secondary cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                    data-testid={`gallery-item-${index}`}
                  >
                    {item.type === "image" && item.result_url ? (
                      <img
                        src={item.result_url}
                        alt={item.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                        <Icon className="w-10 h-10 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs line-clamp-2">{item.prompt}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-white/70 capitalize">{item.provider}</span>
                          <span className="text-xs text-white/50">•</span>
                          <span className="text-xs text-white/70 capitalize">{item.type}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Type Badge */}
                    <div className="absolute top-2 right-2">
                      <div className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="capitalize">{selectedItem?.type} Details</DialogTitle>
            </DialogHeader>
            
            {selectedItem && (
              <div className="space-y-4">
                {/* Media Display */}
                <div className="aspect-video rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
                  {selectedItem.type === "image" && selectedItem.result_url && (
                    <img
                      src={selectedItem.result_url}
                      alt={selectedItem.prompt}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {selectedItem.type === "video" && selectedItem.result_url && (
                    <video
                      src={selectedItem.result_url}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-contain"
                    />
                  )}
                  {selectedItem.type === "voice" && selectedItem.result_url && (
                    <div className="flex flex-col items-center gap-4 p-8">
                      <div className="relative w-24 h-24">
                        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 ${isPlaying ? 'animate-pulse' : ''}`} />
                        <button
                          onClick={() => {
                            const audio = document.getElementById("gallery-audio");
                            if (isPlaying) {
                              audio.pause();
                            } else {
                              audio.play();
                            }
                            setIsPlaying(!isPlaying);
                          }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          {isPlaying ? (
                            <Pause className="w-10 h-10 text-white" />
                          ) : (
                            <Play className="w-10 h-10 text-white ml-1" />
                          )}
                        </button>
                      </div>
                      <audio
                        id="gallery-audio"
                        src={selectedItem.result_url}
                        onEnded={() => setIsPlaying(false)}
                      />
                    </div>
                  )}
                </div>

                {/* Prompt */}
                <div>
                  <p className="text-sm font-medium mb-1">Prompt</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.prompt}</p>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">
                    {selectedItem.provider}
                  </span>
                  {selectedItem.model && (
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                      {selectedItem.model}
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                    {new Date(selectedItem.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleDownload(selectedItem)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                    data-testid="modal-download-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(selectedItem.generation_id)}
                    className="rounded-full text-destructive hover:text-destructive"
                    data-testid="modal-delete-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
