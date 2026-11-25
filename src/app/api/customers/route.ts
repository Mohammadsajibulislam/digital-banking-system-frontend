import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { listCustomers, registerCustomer } from "@/lib/services/management";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(60).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
  verified: z.enum(["true", "false"]).optional(),
});

export async function GET(req: Request) {
  try {
    await requireUser(["ADMIN", "STAFF"]);
    const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
    const { verified, ...rest } = parsed.data;
    return NextResponse.json(await listCustomers({
      ...rest,
      verified: verified === undefined ? undefined : verified === "true",
    }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(["ADMIN", "STAFF"]);
    const parsed = z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().email(),
      phone: z.string().trim().regex(/^01\d{9}$/),
      address: z.string().trim().max(200).optional(),
      accountType: z.enum(["SAVINGS", "CURRENT", "BUSINESS"]),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    const result = await registerCustomer(user.id, parsed.data);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
