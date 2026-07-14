import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storyId = params.id;
    const { pageNumber, content } = await request.json();

    if (pageNumber === undefined || !content) {
      return NextResponse.json(
        { error: "Page number and content are required" },
        { status: 400 }
      );
    }

    // Verify ownership of the story
    const story = await prisma.story.findUnique({
      where: {
        id: storyId,
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update page content
    const updatedPage = await prisma.storyPage.updateMany({
      where: {
        storyId: storyId,
        pageNumber: parseInt(pageNumber, 10),
      },
      data: {
        content: content,
      },
    });

    if (updatedPage.count === 0) {
      return NextResponse.json({ error: "Story page not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Page updated successfully" });
  } catch (error) {
    console.error("Update story page error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
