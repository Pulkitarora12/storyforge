import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface UserSession {
  userId: string;
  email: string;
  name: string | null;
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) {
    return null;
  }

  try {
    const dbSession = await prisma.session.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!dbSession) {
      return null;
    }

    // Check expiry
    if (new Date() > dbSession.expiresAt) {
      // Delete expired session
      await prisma.session.delete({ where: { id: dbSession.id } });
      return null;
    }

    return {
      userId: dbSession.user.id,
      email: dbSession.user.email,
      name: dbSession.user.name,
    };
  } catch (error) {
    console.error("Error retrieving session:", error);
    return null;
  }
}
