import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "../App";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Upload, X, File, Image, Video, Mic, Loader2 } from "lucide-react";

export default function FileUpload({ 
  accept = "*/*",
  maxSize = 50 * 1024 * 1024, // 50MB default
  onUpload,
  label = "Upload File",
  description = "Drag and drop or click to upload",
  className = ""
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const inputRef = useRef(null);

  const getFileIcon = (type) => {
    if (type?.startsWith("image/")) return Image;
    if (type?.startsWith("video/")) return Video;
    if (type?.startsWith("audio/")) return Mic;
    return File;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files?.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${API}/generate/upload`, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setUploadedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url: response.data.url,
        file_id: response.data.file_id
      });

      if (onUpload) {
        onUpload(response.data);
      }

      toast.success("File uploaded successfully!");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to upload file";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (onUpload) {
      onUpload(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const FileIcon = uploadedFile ? getFileIcon(uploadedFile.type) : Upload;

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        data-testid="file-input"
      />

      <AnimatePresence mode="wait">
        {uploadedFile ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10">
                  <FileIcon className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  className="rounded-full"
                  data-testid="clear-file-btn"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Preview for images */}
              {uploadedFile.type?.startsWith("image/") && uploadedFile.url && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <img
                    src={uploadedFile.url}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}

              {/* Audio player for audio files */}
              {uploadedFile.type?.startsWith("audio/") && uploadedFile.url && (
                <div className="mt-4">
                  <audio src={uploadedFile.url} controls className="w-full" />
                </div>
              )}
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card
              className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
                isDragging
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-500/50"
              }`}
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="upload-dropzone"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                {uploading ? (
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                ) : (
                  <div className="p-4 rounded-full bg-secondary">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{uploading ? "Uploading..." : label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
