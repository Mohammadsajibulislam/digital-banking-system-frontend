import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { listTransactions } from "@/lib/services/transactions";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    q: z.string().trim().max(40).optional(),
    type: z.enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER", "LOAN_DISBURSEMENT", "LOAN_REPAYMENT"]).optional(),
    status: z.enum(["PENDING", "COMPLETED", "FAILED", "REVERSED"]).optional(),
    from: date.optional(),
    to: date.optional(),
    accountId: z.string().max(40).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "From date must be before To date",
  });

export async function GET(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER", "STAFF", "ADMIN"]);
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
    }

    const data = await listTransactions(
      { id: user.id, role: user.role },
      parsed.data
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
