import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/services/notifications";

const schema = z.union([
  z.object({ id: z.string().min(1).max(40) }),
  z.object({ all: z.literal(true) }),
]);

export async function POST(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER", "STAFF", "ADMIN"]);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    const result = "all" in parsed.data
      ? await markAllNotificationsRead(user.id)
      : await markNotificationRead(user.id, parsed.data.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
