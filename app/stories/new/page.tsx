"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileText,
  HelpCircle,
  Loader2,
  CheckCircle,
  FileCode,
  Image as ImageIcon,
  Film,
  Trash2,
} from "lucide-react";

const LOADING_MESSAGES = [
  "Uploading inspiration to Cloudinary...",
  "Gemini is analyzing the characters in your drawing...",
  "Weaving your ideas into a 10-page structure...",
  "Drafting age-appropriate vocabulary and tone...",
  "Generating page scene descriptions...",
  "Structuring HTML book pages...",
  "Applying final edits and polishing illustrations...",
  "Saving your storybook to the Forge database..."
];

export default function NewStoryPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [ageGroup, setAgeGroup] = useState("children");
  
  // Media states
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"IMAGE" | "ANIMATION">("IMAGE");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generation states
  const [generating, setGenerating] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Rotating loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [generating]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedList = Array.from(files);
      setMediaFiles((prev) => [...prev, ...selectedList]);
      setMediaUrls([]); // reset uploaded urls on new additions
      setUploadProgress(0);
    }
  };

  // Remove individual file from upload list
  const removeFile = (idxToRemove: number) => {
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    setMediaUrls([]);
    setUploadProgress(0);
    setError(null);
  };

  // Perform direct signed Cloudinary upload for multiple files
  const uploadAllToCloudinary = async () => {
    if (mediaFiles.length === 0) return null;
    
    setUploading(true);
    setUploadProgress(10);
    setError(null);

    const urls: string[] = [];
    const types: string[] = [];

    try {
      // 1. Get signed upload signature from backend once
      const signatureResponse = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!signatureResponse.ok) {
        throw new Error("Failed to authenticate Cloudinary upload configuration.");
      }

      const sigData = await signatureResponse.json();
      setUploadProgress(20);

      // 2. Upload each file sequentially
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sigData.apiKey);
        formData.append("timestamp", sigData.timestamp.toString());
        formData.append("signature", sigData.signature);
        formData.append("folder", sigData.folder);

        const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4");
        const resourceType = isVideo ? "video" : "image";
        
        const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`;
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed uploading file "${file.name}" to Cloudinary.`);
        }

        const uploadData = await uploadResponse.json();
        urls.push(uploadData.secure_url);
        types.push(isVideo ? "ANIMATION" : "IMAGE");

        const percent = 20 + Math.round((80 * (i + 1)) / mediaFiles.length);
        setUploadProgress(percent);
      }

      setMediaUrls(urls);
      const finalType = types.includes("ANIMATION") ? "ANIMATION" : "IMAGE";
      setMediaType(finalType);

      return urls;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during file upload.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Submit final generation prompt directly from Step 2
  const handleStep2Submit = async () => {
    if (mediaFiles.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }

    setGenerating(true);
    setError(null);
    setLoadingMessageIndex(0);

    try {
      let urls = mediaUrls;
      if (urls.length === 0) {
        const uploadedUrls = await uploadAllToCloudinary();
        if (!uploadedUrls || uploadedUrls.length === 0) {
          setGenerating(false);
          return;
        }
        urls = uploadedUrls;
      }

      if (!title || !prompt || urls.length === 0) {
        throw new Error("Missing key parameters. Please check your inputs.");
      }

      const response = await fetch("/api/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          prompt,
          ageGroup,
          sourceMediaUrl: urls,
          sourceMediaType: mediaType,
          preContext: "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate storybook. Please try again.");
      }

      // Successful creation, redirect to reader
      router.push(`/stories/${data.storyId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex-grow flex flex-col justify-center">
      {/* Loading Overlay */}
      {generating && (
        <div className="fixed inset-0 bg-background/90 z-50 flex flex-col items-center justify-center p-6 transition-all duration-300">
          <div className="space-y-8 text-center max-w-md">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight">Forging Storybook...</h2>
              <p className="text-muted-foreground text-sm font-medium h-12 transition-all duration-300">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </p>
            </div>
            <div className="flex gap-1 justify-center">
              {LOADING_MESSAGES.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === loadingMessageIndex ? "w-6 bg-primary" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Wizard Form Container */}
      <div className="glass border border-border p-8 sm:p-10 rounded-3xl shadow-xl space-y-8">
        {/* Wizard Headers */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Step {step} of 2
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {step === 1 && "Storybook Parameters"}
              {step === 2 && "Upload Visual Inspiration"}
            </h1>
          </div>
          
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  s === step
                    ? "bg-primary scale-110 shadow-sm"
                    : s < step
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Storybook Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Barnaby's Great Balloon Adventure"
                className="block w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold">What is the story about?</label>
              <textarea
                required
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your plot, characters, or conflict. e.g. A small rabbit named Barnaby finds a giant red balloon and uses it to fly high, discovering new places and making friends with a bird."
                className="block w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold">Target Level</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "children", label: "Children", desc: "Ages 3-12. Simple vocabulary, engaging narratives." },
                  { id: "teenagers", label: "Teenagers", desc: "Ages 13-19. Complex plots, rich dialogue, and mature themes." },
                  { id: "above-that", label: "Above That", desc: "Ages 20+. Sophisticated themes, nuanced characters, and literary vocabulary." },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setAgeGroup(tier.id)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 ${
                      ageGroup === tier.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted bg-background/40"
                    }`}
                  >
                    <span className="font-bold text-sm text-foreground">{tier.label}</span>
                    <span className="text-xs text-muted-foreground mt-1 leading-snug">{tier.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  if (!title.trim() || !prompt.trim()) {
                    setError("Please enter a title and a creative prompt to proceed.");
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all text-sm shadow-md"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Protagonist Image or Animation</label>
              <p className="text-xs text-muted-foreground">
                Upload any picture or video (GIF, MP4) of a character, toy, or drawing. The AI will treat the subject as the protagonist!
              </p>
            </div>

            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 bg-background/30 hover:bg-background/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative group min-h-[160px]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
                multiple
              />

              <div className="space-y-4 text-center">
                <div className="inline-flex p-3 bg-muted rounded-2xl text-muted-foreground group-hover:scale-105 transition-transform duration-200">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Click to choose one or more images/videos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WEBP, GIF, or MP4
                  </p>
                </div>
              </div>

              {uploading && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-2xl p-6">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-sm font-bold">Uploading files directly to Cloudinary...</p>
                  <div className="w-48 bg-muted h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Selected Files List */}
            {mediaFiles.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Selected Files ({mediaFiles.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mediaFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-secondary/35 border border-border">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                          {file.type.startsWith("video/") ? (
                            <Film className="w-4 h-4" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate max-w-[160px]">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        disabled={uploading}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of Uploaded Media */}
            {mediaUrls.length > 0 && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border flex flex-col gap-3">
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  All Files Uploaded ({mediaUrls.length})
                </span>
                <div className="flex flex-wrap gap-3">
                  {mediaUrls.map((url, idx) => {
                    const isAnim = url.endsWith(".mp4") || mediaFiles[idx]?.type.startsWith("video/");
                    return (
                      <div key={idx} className="relative w-20 aspect-square rounded-lg overflow-hidden border border-border bg-black">
                        {isAnim ? (
                          <video src={url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                        ) : (
                          <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-all text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleStep2Submit}
                disabled={mediaFiles.length === 0 || uploading || generating}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : generating ? "Generating..." : "Generate Storybook"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
