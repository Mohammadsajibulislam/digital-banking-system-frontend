import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { resolveFlag } from "@/lib/services/flags";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Flag not found");
    const parsed = z.object({
      decision: z.enum(["RESOLVE", "DISMISS"]),
      note: z.string().trim().min(3, "Please write a note").max(300, "Note is too long"),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await resolveFlag({ id: admin.id, role: admin.role }, id, parsed.data.decision, parsed.data.note));
  } catch (error) {
    return handleApiError(error);
  }
}
