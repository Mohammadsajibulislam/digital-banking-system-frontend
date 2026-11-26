import { after, NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { executeTransfer } from "@/lib/services/transfer";
import { screenTransfer } from "@/lib/services/risk";

// Server-e input abar validate kori. Frontend validation shudhu UX-er jonno.
const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Select a source account"),
  toAccountNumber: z
    .string()
    .regex(/^\d{10}$/, "Account number must be 10 digits"),
  amount: z
    .string()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount")
    .refine((value) => Number(value) > 0, "Amount must be greater than 0"),
  description: z.string().trim().max(140, "Description is too long").optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
  idempotencyKey: z.string().uuid("Invalid request key"),
});

export async function POST(req: Request) {
  try {
    // Shudhu CUSTOMER transfer korte pare. Staff/Admin na.
    const user = await requireUser(["CUSTOMER"]);

    const body = await req.json().catch(() => null);
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const result = await executeTransfer(user.id, parsed.data);
    if (!result.duplicate) {
      after(() => screenTransfer(result.id));
    }
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}