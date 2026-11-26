import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { createRequest, listRequests } from "@/lib/services/requests";

export async function GET(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER", "STAFF", "ADMIN"]);
    const parsed = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(50).default(10),
      status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
      type: z.enum(["DEPOSIT", "WITHDRAWAL"]).optional(),
    }).safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
    return NextResponse.json(await listRequests({ id: user.id, role: user.role }, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER"]);
    const parsed = z.object({
      type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
      accountId: z.string().min(1),
      amount: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/).refine((value) => Number(value) > 0),
      description: z.string().trim().max(140).optional(),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await createRequest(user.id, parsed.data), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
