import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
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
  Film, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Loader2,
  Clock,
  Layers,
  Clapperboard
} from "lucide-react";

export default function Storyboards() {
  const navigate = useNavigate();
  const [storyboards, setStoryboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetchStoryboards();
  }, []);

  const fetchStoryboards = async () => {
    try {
      const res = await axios.get(`${API}/storyboards`, { withCredentials: true });
      setStoryboards(res.data.storyboards || []);
    } catch (error) {
      console.error("Error fetching storyboards:", error);
      toast.error("Failed to load storyboards");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await axios.post(`${API}/storyboards`, {
        title: newTitle || "Untitled Storyboard"
      }, { withCredentials: true });
      
      toast.success("Storyboard created!");
      setShowCreateDialog(false);
      setNewTitle("");
      navigate(`/storyboard/${res.data.storyboard_id}`);
    } catch (error) {
      toast.error("Failed to create storyboard");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (storyboardId) => {
    try {
      await axios.delete(`${API}/storyboards/${storyboardId}`, { withCredentials: true });
      toast.success("Storyboard deleted");
      setStoryboards(prev => prev.filter(s => s.storyboard_id !== storyboardId));
      setShowDeleteDialog(null);
    } catch (error) {
      toast.error("Failed to delete storyboard");
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight flex items-center gap-3">
              <Clapperboard className="w-9 h-9 text-orange-500" />
              Storyboard Studio
            </h1>
            <p className="text-muted-foreground mt-1">
              Shape your narrative, scene by scene
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6"
            data-testid="new-storyboard-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Storyboard
          </Button>
        </div>

        {/* Storyboards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : storyboards.length === 0 ? (
          <Card className="p-16 text-center bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border-zinc-700/50">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center">
                <Film className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="font-heading font-bold text-2xl mb-3">
                This is where the story begins.
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Create your first storyboard and start shaping your narrative visually, scene by scene.
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Storyboard
              </Button>
            </motion.div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {storyboards.map((storyboard, index) => (
                <motion.div
                  key={storyboard.storyboard_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/storyboard/${storyboard.storyboard_id}`}>
                    <Card 
                      className="group overflow-hidden bg-zinc-900/50 border-zinc-700/50 hover:border-orange-500/50 transition-all duration-300 cursor-pointer"
                      data-testid={`storyboard-card-${index}`}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-zinc-800/50 relative overflow-hidden">
                        {storyboard.thumbnail_url ? (
                          <img
                            src={storyboard.thumbnail_url}
                            alt={storyboard.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-12 h-12 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Scene count badge */}
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {storyboard.scenes?.length || 0} scenes
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-semibold text-lg truncate group-hover:text-orange-500 transition-colors">
                              {storyboard.title}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(storyboard.updated_at)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.preventDefault();
                                navigate(`/storyboard/${storyboard.storyboard_id}`);
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  setShowDeleteDialog(storyboard.storyboard_id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-zinc-900 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">New Storyboard</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Enter storyboard title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                data-testid="storyboard-title-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                You can always change this later.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-full">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                data-testid="create-storyboard-submit"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Storyboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-700">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Storyboard?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All scenes and media in this storyboard will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(showDeleteDialog)}
                className="bg-destructive text-destructive-foreground rounded-full"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
