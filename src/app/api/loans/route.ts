import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { LOAN_LIMITS } from "@/lib/loan-math";
import { applyForLoan, listLoans } from "@/lib/services/loans";

const amount = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount").refine((value) => Number(value) > 0, "Amount must be greater than 0");
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "ACTIVE", "COMPLETED"]).optional(),
});
const applySchema = z.object({
  type: z.enum(["PERSONAL", "HOME", "CAR", "EDUCATION", "BUSINESS"]),
  accountId: z.string().min(1, "Select an account"),
  requestedAmount: amount,
  durationMonths: z.number().int().min(LOAN_LIMITS.minMonths).max(LOAN_LIMITS.maxMonths),
  monthlyIncome: amount,
  employmentStatus: z.enum(["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER", "STUDENT", "UNEMPLOYED"]),
  description: z.string().trim().max(300, "Description is too long").optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER", "STAFF", "ADMIN"]);
    const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
    return NextResponse.json(await listLoans({ id: user.id, role: user.role }, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER"]);
    const parsed = applySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await applyForLoan(user.id, parsed.data), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
