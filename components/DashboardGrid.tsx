"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, BookOpen, Trash2, Calendar, Film, Image as ImageIcon, Loader2 } from "lucide-react";

interface Story {
  id: string;
  title: string;
  sourceMediaUrl: string;
  sourceMediaType: "IMAGE" | "ANIMATION";
  status: "GENERATING" | "COMPLETED" | "FAILED";
  ageGroup: string;
  createdAt: Date;
}

interface DashboardGridProps {
  initialStories: Story[];
}

const AGE_LABELS: Record<string, string> = {
  toddler: "Toddler (2-3)",
  preschool: "Preschool (4-6)",
  "early-reader": "Early Reader (7-9)",
  "middle-grade": "Middle Grade (10-12)",
};

export default function DashboardGrid({ initialStories }: DashboardGridProps) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/stories/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStories(stories.filter((story) => story.id !== id));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete story.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An error occurred while deleting the story.");
    } finally {
      setDeletingId(null);
    }
  };

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass border border-border rounded-3xl max-w-2xl mx-auto mt-10">
        <div className="p-4 bg-primary/10 rounded-full text-primary mb-6 animate-bounce">
          <BookOpen className="w-12 h-12" />
        </div>
        <h3 className="text-2xl font-bold mb-2">No stories created yet</h3>
        <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
          Create your very first AI-illustrated children's storybook by uploading a drawing or animation and describing your vision.
        </p>
        <Link
          href="/stories/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 shadow-md shadow-primary/10 text-sm"
        >
          <Plus className="w-5 h-5" />
          Create a Story
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Stories</h2>
          <p className="text-sm text-muted-foreground">
            Manage and read your created storybooks
          </p>
        </div>
        <Link
          href="/stories/new"
          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 shadow-md shadow-primary/10 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Story
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {stories.map((story) => (
          <div
            key={story.id}
            className="group flex flex-col glass border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 relative"
          >
            {/* Thumbnail Header */}
            <div className="relative aspect-[4/3] bg-muted overflow-hidden border-b border-border">
              {story.sourceMediaType === "ANIMATION" ? (
                <video
                  src={story.sourceMediaUrl}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : (
                <img
                  src={story.sourceMediaUrl}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              )}
              {/* Media Type Badge */}
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                {story.sourceMediaType === "ANIMATION" ? (
                  <>
                    <Film className="w-3 h-3" />
                    Animation
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3 h-3" />
                    Image
                  </>
                )}
              </span>

              {/* Age Group Badge */}
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary/95 text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider">
                {AGE_LABELS[story.ageGroup] || story.ageGroup}
              </span>
            </div>

            {/* Content Details */}
            <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                  {story.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/stories/${story.id}`}
                  className="flex-grow flex items-center justify-center py-2 px-4 rounded-xl bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground font-bold transition-all duration-200 text-sm border border-border hover:border-transparent text-center"
                >
                  Read Book
                </Link>
                <button
                  onClick={() => handleDelete(story.id, story.title)}
                  disabled={deletingId === story.id}
                  className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all duration-200"
                  aria-label="Delete story"
                >
                  {deletingId === story.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
