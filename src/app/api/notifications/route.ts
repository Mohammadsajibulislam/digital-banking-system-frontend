import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { listNotifications } from "@/lib/services/notifications";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  unread: z.enum(["true", "false"]).optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER", "STAFF", "ADMIN"]);
    const parsed = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
    return NextResponse.json(await listNotifications(user.id, {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      unreadOnly: parsed.data.unread === "true",
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
