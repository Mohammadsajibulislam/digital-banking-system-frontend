import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { createFlag, listFlags } from "@/lib/services/flags";

const TXN_ID = /^TXN-\d{8}-[A-F0-9]{6}$/;
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]).optional(),
  txnId: z.string().regex(TXN_ID, "Invalid transaction ID").optional(),
});
const createSchema = z.object({
  txnId: z.string().regex(TXN_ID, "Invalid transaction ID"),
  reason: z.string().trim().min(5, "Please explain why this looks suspicious").max(300, "Reason is too long"),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser(["ADMIN", "STAFF"]);
    const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
    return NextResponse.json(await listFlags({ id: user.id, role: user.role }, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(["ADMIN", "STAFF"]);
    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    const result = await createFlag({ id: user.id, role: user.role }, parsed.data.txnId, parsed.data.reason);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
