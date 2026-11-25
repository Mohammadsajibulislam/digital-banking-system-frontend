import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { setCustomerStatus } from "@/lib/services/management";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser(["ADMIN"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Customer not found");
    const parsed = z.object({
      status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]),
      reason: z.string().trim().max(200).optional(),
    }).refine((value) => value.status !== "BLOCKED" || (value.reason && value.reason.length >= 3), { message: "Please write a reason for blocking" }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await setCustomerStatus(admin.id, id, parsed.data.status, parsed.data.reason));
  } catch (error) {
    return handleApiError(error);
  }
}
