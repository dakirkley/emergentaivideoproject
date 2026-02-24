import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Image as ImageIcon, 
  Music, 
  FileText, 
  Trash2, 
  GripVertical,
  MoreVertical
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function SceneCard({ 
  scene, 
  index, 
  isSelected, 
  onClick, 
  onDelete,
  isDragging = false
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: scene.scene_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasImage = scene.image?.url;
  const hasAudio = scene.audio?.url;
  const hasScript = scene.script && scene.script.trim().length > 0;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isSortableDragging ? 0.5 : 1, 
        scale: isDragging ? 1.05 : 1 
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`flex-shrink-0 w-64 group ${isDragging ? "z-50" : ""}`}
    >
      <div
        onClick={onClick}
        className={`
          relative h-80 rounded-xl overflow-hidden cursor-pointer
          bg-card border-2 transition-all duration-300
          ${isSelected 
            ? "border-orange-500 ring-2 ring-orange-500/20" 
            : "border-border/50 hover:border-border"
          }
          ${isDragging ? "shadow-2xl" : "hover:shadow-lg"}
        `}
        data-testid={`scene-card-${index}`}
      >
        {/* Scene Number Badge */}
        <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium border border-border/50">
          {(index + 1).toString().padStart(2, '0')}
        </div>

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Image/Thumbnail Area */}
        <div className="h-40 bg-secondary/50 relative overflow-hidden">
          {hasImage ? (
            <img
              src={scene.image.url}
              alt={scene.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Media Indicators */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {hasImage && (
              <div className="p-1 rounded bg-background/80 backdrop-blur-sm">
                <ImageIcon className="w-3 h-3 text-foreground" />
              </div>
            )}
            {hasAudio && (
              <div className="p-1 rounded bg-background/80 backdrop-blur-sm">
                <Music className="w-3 h-3 text-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <h3 className="font-heading font-semibold text-sm truncate">
            {scene.title || "Untitled Scene"}
          </h3>
          
          {hasScript ? (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {scene.script}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">
              No script yet...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasScript && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>{scene.script?.split(/\s+/).length || 0} words</span>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Scene
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
