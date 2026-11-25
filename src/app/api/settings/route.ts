import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { readSettings, updateSettings } from "@/lib/services/settings";

const amount = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount");

export async function GET() {
  try {
    await requireUser(["ADMIN"]);
    return NextResponse.json(await readSettings());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireUser(["ADMIN"]);
    const parsed = z.object({
      dailyTransferLimit: amount,
      maxSingleTransaction: amount,
      minAccountBalance: amount,
      transferFee: amount,
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    return NextResponse.json(await updateSettings(admin.id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
