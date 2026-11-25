import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { addLoanNote } from "@/lib/services/loans";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["STAFF", "ADMIN"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Loan not found");
    const parsed = z.object({ note: z.string().trim().min(3).max(500) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await addLoanNote(user.id, id, parsed.data.note), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
