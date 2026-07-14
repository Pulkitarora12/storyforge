"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sun, Moon, BookOpen, LogOut, User as UserIcon } from "lucide-react";

interface HeaderProps {
  user: {
    userId: string;
    email: string;
    name: string | null;
  } | null;
}

export default function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/sign-in");
        router.refresh();
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border glass bg-opacity-70 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
            StoryForge
          </span>
        </Link>

        {/* Navigation / Actions */}
        <div className="flex items-center gap-4">
          {user && (
            <Link
              href="/dashboard"
              className="text-sm font-semibold hover:text-primary transition-colors duration-200"
            >
              Dashboard
            </Link>
          )}

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-lg border border-border hover:bg-muted text-foreground/80 hover:text-foreground transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          )}

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-3 border-l border-border pl-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-bold text-foreground">
                  {user.name || user.email.split("@")[0]}
                </span>
                <span className="text-xs text-muted-foreground">Logged in</span>
              </div>
              <div className="p-2 bg-muted rounded-full text-muted-foreground sm:block hidden">
                <UserIcon className="w-4 h-4" />
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white transition-all duration-200 text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Link
                href="/sign-in"
                className="text-sm font-semibold hover:text-primary transition-colors duration-200 px-3 py-1.5"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 px-3.5 py-1.5 rounded-lg shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
