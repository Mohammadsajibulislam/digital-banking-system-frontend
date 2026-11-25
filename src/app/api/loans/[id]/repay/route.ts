import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { repayInstallment } from "@/lib/services/loans";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["CUSTOMER"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Loan not found");
    const parsed = z.object({
      installmentId: z.string().min(1).max(40),
      pin: z.string().regex(/^\d{4}$/),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await repayInstallment(user.id, id, parsed.data.installmentId, parsed.data.pin));
  } catch (error) {
    return handleApiError(error);
  }
}
