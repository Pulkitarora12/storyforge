"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Save,
  X,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";

interface StoryPage {
  id: string;
  pageNumber: number;
  content: string;
  imageUrl: string | null;
  sceneDescription: string | null;
}

interface Story {
  id: string;
  title: string;
  sourceMediaUrl: string;
  sourceMediaType: "IMAGE" | "ANIMATION";
  ageGroup: string;
  pages: StoryPage[];
}

interface StoryViewerProps {
  initialStory: Story;
}

export default function StoryViewer({ initialStory }: StoryViewerProps) {
  const [story, setStory] = useState<Story>(initialStory);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePage = story.pages[currentPageIndex];

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: activePage?.content || "",
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert max-w-none focus:outline-none min-h-[140px] p-4 rounded-xl border border-primary bg-background/50 focus:ring-2 focus:ring-primary/20 transition-all",
      },
    },
  });

  // Sync editor content when changing slides
  useEffect(() => {
    if (editor && activePage) {
      editor.commands.setContent(activePage.content);
      setEditorContent(activePage.content);
    }
    setIsEditing(false); // Reset edit mode on page change
    setError(null);
  }, [currentPageIndex, editor, activePage]);

  // Slideshow navigation helper functions
  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPageIndex < story.pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  // Keyboard navigation event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return; // Do not intercept keys if typing in editor

      if (e.key === "ArrowLeft") {
        prevPage();
      } else if (e.key === "ArrowRight") {
        nextPage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPageIndex, isEditing, story.pages.length]);

  // Save updated story content
  const handleSave = async () => {
    if (!activePage) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/stories/${story.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: activePage.pageNumber,
          content: editorContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save page edits.");
      }

      // Update local state
      const updatedPages = [...story.pages];
      updatedPages[currentPageIndex] = {
        ...activePage,
        content: editorContent,
      };

      setStory({
        ...story,
        pages: updatedPages,
      });

      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!activePage) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-muted-foreground text-sm">Failed to load story pages.</p>
      </div>
    );
  }

  // Detect visual illustration format
  const isVideo = activePage.imageUrl?.endsWith(".mp4") || story.sourceMediaType === "ANIMATION";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 flex flex-col items-center">
      {/* Title / Info Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {story.title}
        </h1>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Page {activePage.pageNumber} of {story.pages.length}</span>
        </div>
      </div>

      {error && (
        <div className="w-full p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {/* Main Book Reader Container */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 glass border border-border p-6 sm:p-8 rounded-3xl shadow-xl min-h-[440px]">
        {/* Left Side: Illustration / Video */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden border border-border bg-black relative group flex items-center justify-center">
          {activePage.imageUrl ? (
            isVideo ? (
              <video
                src={activePage.imageUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <img
                src={activePage.imageUrl}
                alt={`Illustration for page ${activePage.pageNumber}`}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2 p-6">
              <ImageIcon className="w-10 h-10 animate-pulse" />
              <span className="text-xs">No illustration generated</span>
            </div>
          )}
          
          {/* Page Tag Overlay */}
          <span className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
            Page {activePage.pageNumber}
          </span>
        </div>

        {/* Right Side: Text & Tiptap Editor */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="flex-grow space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-primary tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Story Content
            </h3>
            
            {isEditing && editor ? (
              <div className="space-y-4">
                <EditorContent editor={editor} />
                
                {/* Editor Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all text-xs shadow-sm disabled:opacity-55"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      editor.commands.setContent(activePage.content);
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-all text-xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Safe HTML rendering for Tiptap stories */}
                <div
                  className="prose dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: activePage.content }}
                />

                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background/50 hover:bg-muted text-xs font-bold text-foreground/80 hover:text-foreground transition-all duration-200"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Text
                </button>
              </div>
            )}
          </div>

          {/* Scene Illustration Description */}
          {activePage.sceneDescription && (
            <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs text-muted-foreground leading-normal space-y-1">
              <span className="font-bold text-foreground/80 block uppercase tracking-wider text-[10px]">
                Illustration Intent (Prompt):
              </span>
              <p className="italic">{activePage.sceneDescription}</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide Navigation Overlay Footer */}
      <div className="flex items-center justify-between w-full max-w-md pt-4">
        <button
          onClick={prevPage}
          disabled={currentPageIndex === 0}
          className="p-3 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page Dots Navigation */}
        <div className="flex items-center gap-1.5">
          {story.pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setCurrentPageIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                idx === currentPageIndex
                  ? "bg-primary scale-125 shadow-sm shadow-primary/20"
                  : "bg-muted hover:bg-muted-foreground/30"
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={nextPage}
          disabled={currentPageIndex === story.pages.length - 1}
          className="p-3 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-[10px] text-muted-foreground/60 text-center font-medium">
        Tip: You can use your keyboard&apos;s left and right arrow keys to navigate slides.
      </div>
    </div>
  );
}
