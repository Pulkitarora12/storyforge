"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
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
  const [ageGroup, setAgeGroup] = useState("preschool");
  
  // Media states
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"IMAGE" | "ANIMATION">("IMAGE");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [preContext, setPreContext] = useState("");
  
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
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaUrl(null); // Reset URL on new file select
      setUploadProgress(0);
    }
  };

  // Perform direct signed Cloudinary upload
  const uploadToCloudinary = async () => {
    if (!mediaFile) return null;
    
    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      // 1. Get signed upload signature from backend
      const signatureResponse = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!signatureResponse.ok) {
        throw new Error("Failed to authenticate Cloudinary upload configuration.");
      }

      const sigData = await signatureResponse.json();
      setUploadProgress(30);

      // 2. Perform upload
      const formData = new FormData();
      formData.append("file", mediaFile);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);

      const isVideo = mediaFile.type.startsWith("video/") || mediaFile.name.endsWith(".mp4");
      const resourceType = isVideo ? "video" : "image";
      setMediaType(isVideo ? "ANIMATION" : "IMAGE");

      setUploadProgress(50);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`;
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Cloudinary upload failure details:", errorText);
        throw new Error("Failed uploading media directly to Cloudinary storage.");
      }

      const uploadData = await uploadResponse.json();
      setUploadProgress(100);
      setMediaUrl(uploadData.secure_url);
      return uploadData.secure_url;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during file upload.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Run next step or trigger upload
  const handleStep2Next = async () => {
    if (!mediaFile) {
      setError("Please select a file to upload.");
      return;
    }

    if (mediaUrl) {
      setStep(3);
      return;
    }

    const uploadedUrl = await uploadToCloudinary();
    if (uploadedUrl) {
      setStep(3);
    }
  };

  // Submit final generation prompt
  const handleGenerate = async () => {
    if (!title || !prompt || !mediaUrl) {
      setError("Missing key parameters. Please check your inputs.");
      return;
    }

    setGenerating(true);
    setError(null);
    setLoadingMessageIndex(0);

    try {
      const response = await fetch("/api/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          prompt,
          ageGroup,
          sourceMediaUrl: mediaUrl,
          sourceMediaType: mediaType,
          preContext,
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
              <Sparkles className="w-8 h-8 text-primary absolute animate-pulse" />
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
              Step {step} of 3
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {step === 1 && "Storybook Parameters"}
              {step === 2 && "Upload Visual Inspiration"}
              {step === 3 && "Pre-Context & Create"}
            </h1>
          </div>
          
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
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
              <label className="block text-sm font-semibold">Target Age Group Level</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "toddler", label: "Toddler (2-3)", desc: "Simple sentences, familiar vocabulary" },
                  { id: "preschool", label: "Preschool (4-6)", desc: "Active verbs, engaging lessons" },
                  { id: "early-reader", label: "Early Reader (7-9)", desc: "Complex plots, sight words" },
                  { id: "middle-grade", label: "Middle Grade (10-12)", desc: "Rich vocabulary, idioms, emotional growth" },
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
              className="border-2 border-dashed border-border hover:border-primary/50 bg-background/30 hover:bg-background/50 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative group min-h-[220px]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
              />

              {mediaFile ? (
                <div className="space-y-4 text-center">
                  <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary">
                    {mediaFile.type.startsWith("video/") ? (
                      <Film className="w-8 h-8" />
                    ) : (
                      <ImageIcon className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground line-clamp-1">
                      {mediaFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="inline-flex p-4 bg-muted rounded-2xl text-muted-foreground group-hover:scale-105 transition-transform duration-200">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Click to choose image or video
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, WEBP, GIF, or MP4
                    </p>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-2xl p-6">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-sm font-bold">Uploading directly to Cloudinary...</p>
                  <div className="w-48 bg-muted h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preview of Uploaded Media */}
            {mediaUrl && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Uploaded Successfully
                </span>
                <div className="relative w-40 aspect-square rounded-lg overflow-hidden border border-border bg-black">
                  {mediaType === "ANIMATION" ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} alt="Protagonist Preview" className="w-full h-full object-cover" />
                  )}
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
                onClick={handleStep2Next}
                disabled={!mediaFile || uploading}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : mediaUrl ? "Next Step" : "Upload & Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold flex items-center gap-1.5">
                Optional Pre-Context / Custom Elements
                <span title="Add character names, specific colors, moral tags, etc.">
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </span>
              </label>
              <textarea
                rows={5}
                value={preContext}
                onChange={(e) => setPreContext(e.target.value)}
                placeholder="Include custom elements e.g. 'The protagonist rabbit wears a small blue hat and is very silly. The story must include a wise owl named Professor Hoot. End the story with a moral about sharing.'"
                className="block w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm resize-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p className="font-bold text-foreground">Creating a 10-Page Storybook:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your uploaded media's subject will become the protagonist.</li>
                <li>The story will be formatted specifically for a "{ageGroup}" reader.</li>
                <li>Each page will have styled text paragraphs and illustrations.</li>
                <li>Generation typically takes 15-25 seconds using Gemini 2.5 Flash.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-all text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-extrabold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/10"
              >
                <Sparkles className="w-4 h-4" />
                Generate Storybook
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
