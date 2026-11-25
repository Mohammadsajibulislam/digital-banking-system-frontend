import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/auth-guard";
import { getStaffOverview } from "@/lib/services/analytics";

export async function GET() {
  try {
    await requireUser(["STAFF", "ADMIN"]);
    return NextResponse.json(await getStaffOverview());
  } catch (error) {
    return handleApiError(error);
  }
}
