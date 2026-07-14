import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const AGE_CONFIGS: Record<string, {
  description: string;
  sentenceRule: string;
  vocabRule: string;
  wordCountRule: string;
  toneRule: string;
  themesRule: string;
}> = {
  toddler: {
    description: "toddler (2-3 years old)",
    sentenceRule: "Use very simple, short sentences (maximum 4-6 words).",
    vocabRule: "Use basic, familiar words. Avoid complex or abstract terms.",
    wordCountRule: "Keep content under 15-20 words per page.",
    toneRule: "A gentle, playful, repetitive, and extremely comforting tone.",
    themesRule: "Focus on discovery, daily routines, friendly animals, and basic shapes/colors."
  },
  preschool: {
    description: "preschool (4-6 years old)",
    sentenceRule: "Use simple sentences (maximum 6-10 words) with active verbs.",
    vocabRule: "Use simple vocabulary but introduce 1-2 new descriptive words per page with clear context.",
    wordCountRule: "Keep content around 20-30 words per page.",
    toneRule: "Curious, exciting, and highly interactive, engaging the child directly.",
    themesRule: "Focus on friendship, simple problem solving, sharing, emotions, and adventure."
  },
  "early-reader": {
    description: "early reader (7-9 years old)",
    sentenceRule: "Use short to medium sentences (10-15 words). Include some compound sentences.",
    vocabRule: "Use sight words and decodable words. Include engaging adjectives and action verbs.",
    wordCountRule: "Keep content around 35-50 words per page.",
    toneRule: "Adventurous, encouraging, and storytelling-driven.",
    themesRule: "Focus on cooperative problem solving, fantasy, family relationships, and resilience."
  },
  "middle-grade": {
    description: "middle grade (10-12 years old)",
    sentenceRule: "Use varied sentence structures (12-20 words) with both simple and complex patterns.",
    vocabRule: "Use rich, descriptive vocabulary, idioms, and metaphors suitable for developing readers.",
    wordCountRule: "Keep content around 60-80 words per page.",
    toneRule: "Immersive, expressive, and slightly more sophisticated, but still warm and accessible.",
    themesRule: "Focus on identity, complex decisions, mystery, deeper emotional journeys, and teamwork."
  }
};

// Retry handler for Gemini API calls (503/429)
async function generateWithRetry(
  model: any,
  promptParts: any[],
  retries = 4,
  delay = 1000
): Promise<string> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await model.generateContent(promptParts);
      const text = result.response.text();
      if (!text) {
        throw new Error("Empty response from Gemini API");
      }
      return text;
    } catch (error: any) {
      const status = error?.status || error?.statusCode;
      const isRetryable =
        status === 429 ||
        status === 503 ||
        error?.message?.includes("503") ||
        error?.message?.includes("429");

      if (isRetryable && attempt <= retries) {
        console.warn(
          `Gemini API error (status: ${status}, attempt ${attempt}/${retries}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        console.error("Gemini call failed permanently:", error);
        throw error;
      }
    }
  }
  throw new Error("Failed to generate content from Gemini after retries.");
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      title,
      prompt,
      ageGroup,
      sourceMediaUrl,
      sourceMediaType,
      preContext,
    } = await request.json();

    if (!prompt || !sourceMediaUrl || !sourceMediaType || !ageGroup) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const tier = AGE_CONFIGS[ageGroup];
    if (!tier) {
      return NextResponse.json(
        { error: "Invalid age group tier" },
        { status: 400 }
      );
    }

    // Initialize Gemini model configured to use v1beta for JSON mode support
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      },
      { apiVersion: "v1beta" }
    );

    // Download the uploaded media and convert to base64 for Gemini vision input
    let mediaPart: any;
    try {
      const mediaResponse = await fetch(sourceMediaUrl);
      if (!mediaResponse.ok) {
        throw new Error(`Failed to fetch media from Cloudinary: ${mediaResponse.statusText}`);
      }
      const arrayBuffer = await mediaResponse.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      const contentType = mediaResponse.headers.get("content-type") || "image/jpeg";
      
      mediaPart = {
        inlineData: {
          data: base64Data,
          mimeType: contentType,
        },
      };
    } catch (mediaError) {
      console.error("Failed downloading/processing media:", mediaError);
      return NextResponse.json(
        { error: "Failed to download and process uploaded media" },
        { status: 422 }
      );
    }

    const promptText = `
You are an award-winning children's storybook author writing for the "${ageGroup}" age range (target audience: ${tier.description}).

Create a beautifully crafted 10-page children's storybook based on the user's prompt and the provided protagonist image/animation.

Establish your writing style using these strict age-appropriate rules:
- Sentence Structure: ${tier.sentenceRule}
- Vocabulary: ${tier.vocabRule}
- Word Count: ${tier.wordCountRule}
- Tone: ${tier.toneRule}
- Themes to explore: ${tier.themesRule}

User Prompt: "${prompt}"
${preContext ? `Additional story parameters/characters/context: "${preContext}"` : ""}

Mandatory 10-Page Structure (you MUST write exactly 10 pages):
- Page 1: Introduce the setting and main character. Treat the subject of the uploaded image/animation as the protagonist. Give them a name and establish their environment.
- Pages 2-4: Build the situation and initial conflict/problem.
- Pages 5-7: Rising action. The protagonist works to solve the conflict.
- Page 8: Climax of the story. The conflict/action peaks.
- Page 9: The resolution begins, showing the outcome of the climax.
- Page 10: A satisfying ending that loops back or links directly to the setting/character from Page 1.

Important Writing Instructions:
1. Treat the subject of the uploaded media as the protagonist. Weave them into the plot dynamically based on their visual appearance. Do not just describe the image; make it the soul of the story!
2. You must output exactly 10 pages in the array.
3. Each page must contain story content as basic, clean HTML (e.g. use paragraphs <p>story text</p>, with optional inline formatting like <strong> or <em>).
4. Each page must also have a "sceneDescription" that details what is visually happening on that page. This scene description should be suitable for illustrating the page.

You MUST respond strictly with a single JSON object matching this structure (no markdown formatting, no comments, no backticks outside the JSON structure):
{
  "title": "A creative title for the storybook",
  "pages": [
    {
      "pageNumber": 1,
      "content": "HTML string for page 1",
      "sceneDescription": "Description of the scene for page 1 illustration"
    },
    ...
    {
      "pageNumber": 10,
      "content": "HTML string for page 10",
      "sceneDescription": "Description of the scene for page 10 illustration"
    }
  ]
}
`;

    // Fetch response with exponential backoff retry mechanism
    let responseText: string;
    try {
      responseText = await generateWithRetry(model, [promptText, mediaPart]);
    } catch (geminiError: any) {
      console.error("Gemini API call failed after retries:", geminiError);
      return NextResponse.json(
        { error: "AI generation failed. Please try again later." },
        { status: 502 }
      );
    }

    // Parse the output
    let storyData: {
      title: string;
      pages: Array<{ pageNumber: number; content: string; sceneDescription: string }>;
    };
    try {
      // Find start of JSON structure if any markdown wrapping is returned despite json mime type
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}");
      const cleanJson = responseText.substring(jsonStart, jsonEnd + 1);
      storyData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON response:", responseText, parseError);
      return NextResponse.json(
        { error: "AI returned an invalid JSON response structure. Please try again." },
        { status: 502 }
      );
    }

    if (!storyData.pages || storyData.pages.length !== 10) {
      console.error("Gemini failed to output exactly 10 pages:", storyData);
      return NextResponse.json(
        { error: "AI failed to generate exactly 10 storybook pages." },
        { status: 502 }
      );
    }

    // Setup media cycling/distribution logic across 10 pages
    const mediaUrls = [sourceMediaUrl]; // Support future multiple uploads; default is just our source image
    
    // Save Story and StoryPages inside a database transaction
    const story = await prisma.$transaction(async (tx) => {
      const createdStory = await tx.story.create({
        data: {
          userId: session.userId,
          title: storyData.title || title || "Untitled Story",
          contextPrompt: prompt,
          sourceMediaUrl,
          sourceMediaType: sourceMediaType as "IMAGE" | "ANIMATION",
          status: "COMPLETED",
          ageGroup,
          pages: {
            create: storyData.pages.map((p, index) => {
              const pageNum = p.pageNumber || (index + 1);
              // Cycle/loop uploaded images sequentially across the pages
              const pageImg = mediaUrls[(pageNum - 1) % mediaUrls.length];
              return {
                pageNumber: pageNum,
                content: p.content,
                sceneDescription: p.sceneDescription || "",
                imageUrl: pageImg,
              };
            }),
          },
        },
      });

      // Save to Media table as well to track uploads
      await tx.media.create({
        data: {
          userId: session.userId,
          url: sourceMediaUrl,
          type: sourceMediaType as "IMAGE" | "ANIMATION",
          cloudinaryPublicId: sourceMediaUrl.split("/").pop()?.split(".")[0] || "unknown",
        },
      });

      return createdStory;
    });

    return NextResponse.json({ storyId: story.id }, { status: 201 });
  } catch (error) {
    console.error("Story generation route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
