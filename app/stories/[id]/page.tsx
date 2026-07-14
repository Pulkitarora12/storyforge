import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StoryViewer from "@/components/StoryViewer";

export const metadata = {
  title: "Read Story - StoryForge",
};

interface StoryPageProps {
  params: {
    id: string;
  };
}

export default async function StoryDetailPage({ params }: StoryPageProps) {
  const session = await getSession();

  // Route protection
  if (!session) {
    redirect("/sign-in");
  }

  const storyId = params.id;

  // Retrieve story with pages sorted by pageNumber
  const story = await prisma.story.findUnique({
    where: {
      id: storyId,
    },
    include: {
      pages: {
        orderBy: {
          pageNumber: "asc",
        },
      },
    },
  });

  // Verify existence
  if (!story) {
    notFound();
  }

  // Enforce server-side ownership verification
  if (story.userId !== session.userId) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow flex flex-col justify-center">
      <StoryViewer initialStory={story} />
    </div>
  );
}
