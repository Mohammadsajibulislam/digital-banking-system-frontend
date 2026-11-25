import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { updateAccount } from "@/lib/services/management";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Account not found");
    const limit = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).nullable().optional();
    const parsed = z.object({
      status: z.enum(["ACTIVE", "FROZEN"]).optional(),
      type: z.enum(["SAVINGS", "CURRENT", "BUSINESS"]).optional(),
      dailyTransferLimit: limit,
      maxTransactionAmount: limit,
      minBalance: limit,
      reason: z.string().trim().max(200).optional(),
    }).refine((value) => Object.entries(value).some(([key, item]) => key !== "reason" && item !== undefined), { message: "Nothing to update" })
      .refine((value) => value.status !== "FROZEN" || (value.reason && value.reason.length >= 3), { message: "Please write a reason for freezing" })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await updateAccount(admin.id, id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
