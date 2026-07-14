import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardGrid from "@/components/DashboardGrid";
import { BookOpen } from "lucide-react";

export const metadata = {
  title: "Dashboard - StoryForge",
};

export default async function DashboardPage() {
  const session = await getSession();

  // Route protection fallback
  if (!session) {
    redirect("/sign-in");
  }

  // Fetch stories
  const stories = await prisma.story.findMany({
    where: {
      userId: session.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      sourceMediaUrl: true,
      sourceMediaType: true,
      status: true,
      ageGroup: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow flex flex-col">
      {/* Greetings */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold max-w-fit mb-4">
        <BookOpen className="w-3.5 h-3.5" />
        Welcome, {session.name || session.email.split("@")[0]}
      </div>
      
      {/* Dynamic story grid */}
      <DashboardGrid initialStories={stories} />
    </div>
  );
}
