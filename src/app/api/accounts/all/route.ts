import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { listAllAccounts } from "@/lib/services/management";

export async function GET(req: Request) {
  try {
    await requireUser(["ADMIN"]);
    const parsed = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(10),
      q: z.string().trim().max(60).optional(),
      status: z.enum(["ACTIVE", "FROZEN", "CLOSED"]).optional(),
      type: z.enum(["SAVINGS", "CURRENT", "BUSINESS"]).optional(),
    }).safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
    return NextResponse.json(await listAllAccounts(parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
