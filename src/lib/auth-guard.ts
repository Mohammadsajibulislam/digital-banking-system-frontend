import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/roles";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Proti protected API/server action-er shuru-te cholabe.
 *   const user = await requireUser(["ADMIN"]);
 *   const user = await requireUser(["ADMIN", "STAFF"]);
 *   const user = await requireUser(); // je kono logged-in active user
 */
export async function requireUser(allowedRoles?: AppRole[]) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new HttpError(401, "Please sign in to continue");
  }

  // Token-er role bishash na kore database theke fresh data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new HttpError(403, "Your account is not active");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new HttpError(403, "You do not have permission to do this");
  }

  return user;
}

// Route Handler-er catch block-e eta use korbe
export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}