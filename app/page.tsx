import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sparkles, ArrowRight, UploadCloud, BookOpen, PenTool, CheckCircle } from "lucide-react";

export default async function LandingPage() {
  const user = await getSession();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Hero Section */}
      <div className="text-center max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold uppercase tracking-wider animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Gemini 2.5 Flash
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Bring Children's Stories to Life with{" "}
          <span className="bg-gradient-to-r from-primary via-indigo-500 to-pink-500 bg-clip-text text-transparent">
            StoryForge
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Upload any drawing or animation, enter a prompt, and watch as our AI creates a custom, beautifully illustrated 10-page children's storybook.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/20 text-base"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/20 text-base"
              >
                Create Your First Book
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/sign-in"
                className="flex items-center justify-center px-6 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 hover:scale-105 active:scale-95 transition-all duration-200 border border-border text-base"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-24">
        {/* Step 1 */}
        <div className="p-8 rounded-2xl glass hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col space-y-4 border border-border">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground">1. Upload Inspiration</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Directly upload any child's drawing, character sketches, or custom animations directly to Cloudinary from your browser.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-8 rounded-2xl glass hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col space-y-4 border border-border">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
            <PenTool className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground">2. Prompt & Configure</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Select the appropriate reading level from 4 age tiers (Toddler to Middle Grade), customize keywords, and input creative story contexts.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-8 rounded-2xl glass hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col space-y-4 border border-border">
          <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground">3. Read & Edit Inline</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Flip through the beautiful generated 10-page book. Refine pages inline using the integrated Tiptap rich text editor.
          </p>
        </div>
      </div>

      {/* Info Block */}
      <div className="mt-20 p-8 rounded-2xl bg-secondary/30 border border-border w-full flex flex-col md:flex-row md:items-center md:justify-between gap-6 max-w-4xl">
        <div className="space-y-2">
          <h4 className="text-lg font-bold">Try StoryForge Today</h4>
          <p className="text-muted-foreground text-sm">
            Designed for teachers, parents, and story lovers. Craft rich, unique books instantly.
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-foreground/80 font-medium">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Dual-connection Neon DB
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Gemini 2.5 Flash Vision
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Secure UUID Session Auth
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            In-place Tiptap V3 Editing
          </li>
        </ul>
      </div>
    </div>
  );
}
