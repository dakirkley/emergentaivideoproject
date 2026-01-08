import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { API } from "../App";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Sparkles,
  Image,
  Video,
  Mic,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Loader2,
  BookOpen,
  Star,
  Globe,
  Lock
} from "lucide-react";

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prompt: "",
    type: "image",
    provider: "",
    category: "",
    tags: "",
    is_public: false
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [activeType, selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeType !== "all") params.append("type", activeType);
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      
      const res = await axios.get(`${API}/templates?${params.toString()}`, { withCredentials: true });
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/templates/categories`, { withCredentials: true });
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      toast.error("Name and prompt are required");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/templates`, {
        name: formData.name,
        description: formData.description,
        prompt: formData.prompt,
        type: formData.type,
        provider: formData.provider || null,
        category: formData.category || null,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        is_public: formData.is_public
      }, { withCredentials: true });

      toast.success("Template created successfully!");
      setShowCreateDialog(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      toast.error("Name and prompt are required");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/templates/${editingTemplate.template_id}`, {
        name: formData.name,
        description: formData.description,
        prompt: formData.prompt,
        category: formData.category || null,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        is_public: formData.is_public
      }, { withCredentials: true });

      toast.success("Template updated successfully!");
      setShowEditDialog(false);
      setEditingTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await axios.delete(`${API}/templates/${templateId}`, { withCredentials: true });
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete template");
    }
  };

  const handleUseTemplate = async (template) => {
    try {
      await axios.post(`${API}/templates/${template.template_id}/use`, {}, { withCredentials: true });
      
      // Navigate to appropriate generation page with prompt
      const routes = {
        image: "/generate/image",
        video: "/generate/video",
        voice: "/generate/voice"
      };
      
      navigate(routes[template.type], { state: { prompt: template.prompt } });
    } catch (error) {
      toast.error("Failed to use template");
    }
  };

  const handleCopyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const openEditDialog = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      prompt: template.prompt,
      type: template.type,
      provider: template.provider || "",
      category: template.category || "",
      tags: (template.tags || []).join(", "),
      is_public: template.is_public || false
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      prompt: "",
      type: "image",
      provider: "",
      category: "",
      tags: "",
      is_public: false
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "image": return Image;
      case "video": return Video;
      case "voice": return Mic;
      default: return Sparkles;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "image": return "from-pink-500 to-rose-500";
      case "video": return "from-blue-500 to-cyan-500";
      case "voice": return "from-purple-500 to-violet-500";
      default: return "from-orange-500 to-amber-500";
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(query) ||
        t.prompt.toLowerCase().includes(query) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const myTemplates = filteredTemplates.filter(t => t.user_id && !t.is_system);
  const systemTemplates = filteredTemplates.filter(t => t.is_system);
  const communityTemplates = filteredTemplates.filter(t => t.is_public && !t.is_system && !t.user_id);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
              Prompt Templates
            </h1>
            <p className="text-muted-foreground mt-1">
              Browse and save prompt templates for quick generation
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
            data-testid="create-template-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-templates"
            />
          </div>
          <Select value={activeType} onValueChange={setActiveType}>
            <SelectTrigger className="w-40" data-testid="type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="voice">Voice</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40" data-testid="category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">All ({filteredTemplates.length})</TabsTrigger>
              <TabsTrigger value="mine">My Templates ({myTemplates.length})</TabsTrigger>
              <TabsTrigger value="system">Library ({systemTemplates.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <TemplateGrid
                templates={filteredTemplates}
                onUse={handleUseTemplate}
                onCopy={handleCopyPrompt}
                onEdit={openEditDialog}
                onDelete={handleDeleteTemplate}
                getTypeIcon={getTypeIcon}
                getTypeColor={getTypeColor}
              />
            </TabsContent>

            <TabsContent value="mine" className="space-y-6">
              {myTemplates.length === 0 ? (
                <Card className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-heading font-bold text-xl mb-2">No custom templates yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Save your favorite prompts as templates for quick access
                  </p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                  >
                    Create Your First Template
                  </Button>
                </Card>
              ) : (
                <TemplateGrid
                  templates={myTemplates}
                  onUse={handleUseTemplate}
                  onCopy={handleCopyPrompt}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteTemplate}
                  getTypeIcon={getTypeIcon}
                  getTypeColor={getTypeColor}
                  showActions
                />
              )}
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <TemplateGrid
                templates={systemTemplates}
                onUse={handleUseTemplate}
                onCopy={handleCopyPrompt}
                onEdit={openEditDialog}
                onDelete={handleDeleteTemplate}
                getTypeIcon={getTypeIcon}
                getTypeColor={getTypeColor}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Create Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-full">
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                data-testid="save-template-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              isEdit
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-full">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTemplate}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                data-testid="update-template-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                Update Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Template Form Component
function TemplateForm({ formData, setFormData, categories, isEdit = false }) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input
          placeholder="My Awesome Prompt"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          data-testid="template-name-input"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          placeholder="A brief description of this template"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          data-testid="template-description-input"
        />
      </div>

      <div className="space-y-2">
        <Label>Prompt *</Label>
        <Textarea
          placeholder="Enter your prompt template..."
          value={formData.prompt}
          onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
          rows={4}
          className="resize-none"
          data-testid="template-prompt-input"
        />
      </div>

      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
            >
              <SelectTrigger data-testid="template-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Provider (optional)</Label>
            <Select
              value={formData.provider}
              onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v }))}
            >
              <SelectTrigger data-testid="template-provider-select">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="fal">Fal.ai</SelectItem>
                <SelectItem value="kling">Kling AI</SelectItem>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Category</Label>
        <Input
          placeholder="e.g., Portrait, Cinematic, Commercial"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          list="categories"
          data-testid="template-category-input"
        />
        <datalist id="categories">
          {categories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label>Tags (comma-separated)</Label>
        <Input
          placeholder="portrait, professional, studio"
          value={formData.tags}
          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          data-testid="template-tags-input"
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
        <div>
          <p className="font-medium text-sm">Make Public</p>
          <p className="text-xs text-muted-foreground">Share this template with others</p>
        </div>
        <Switch
          checked={formData.is_public}
          onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_public: v }))}
          data-testid="template-public-toggle"
        />
      </div>
    </div>
  );
}

// Template Grid Component
function TemplateGrid({ templates, onUse, onCopy, onEdit, onDelete, getTypeIcon, getTypeColor, showActions = false }) {
  if (templates.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No templates found</p>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {templates.map((template, index) => {
          const TypeIcon = getTypeIcon(template.type);
          const canEdit = template.user_id && !template.is_system;
          
          return (
            <motion.div
              key={template.template_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="p-5 h-full flex flex-col group hover:border-orange-500/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${getTypeColor(template.type)}`}>
                    <TypeIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    {template.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Library
                      </Badge>
                    )}
                    {template.is_public && !template.is_system && (
                      <Globe className="w-4 h-4 text-muted-foreground" />
                    )}
                    {template.user_id && !template.is_public && (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(template)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(template.template_id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <h3 className="font-medium mb-1">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                )}
                
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1 font-mono bg-secondary/50 p-2 rounded">
                  {template.prompt}
                </p>

                {template.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    onClick={() => onUse(template)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full"
                    size="sm"
                    data-testid={`use-template-${template.template_id}`}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Use
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopy(template.prompt)}
                    className="rounded-full"
                    data-testid={`copy-template-${template.template_id}`}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
