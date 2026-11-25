import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { decideLoan } from "@/lib/services/loans";

const amount = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount").refine((value) => Number(value) > 0);
const schema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    approvedAmount: amount.optional(),
    interestRate: z.string().regex(/^\d{1,2}(\.\d{1,2})?$/).refine((value) => Number(value) <= 36),
    note: z.string().trim().max(300).optional(),
  }),
  z.object({ decision: z.literal("REJECT"), note: z.string().trim().min(3).max(300) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["ADMIN"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Loan not found");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await decideLoan({ id: user.id, role: user.role }, id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
