import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { createCustomerAccount } from "@/lib/services/management";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["ADMIN", "STAFF"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Customer not found");
    const parsed = z.object({ type: z.enum(["SAVINGS", "CURRENT", "BUSINESS"]) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await createCustomerAccount(user.id, id, parsed.data.type), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
