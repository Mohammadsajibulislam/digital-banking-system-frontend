import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { decideRequest } from "@/lib/services/requests";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["STAFF", "ADMIN"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Request not found");
    const parsed = z.discriminatedUnion("decision", [
      z.object({ decision: z.literal("APPROVE"), note: z.string().trim().max(300).optional().default("") }),
      z.object({ decision: z.literal("REJECT"), note: z.string().trim().min(3).max(300) }),
    ]).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await decideRequest(user.id, id, parsed.data.decision, parsed.data.note));
  } catch (error) {
    return handleApiError(error);
  }
}
