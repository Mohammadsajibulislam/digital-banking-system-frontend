import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/auth-guard";
import { getAdminAnalytics } from "@/lib/services/analytics";

export async function GET() {
  try {
    await requireUser(["ADMIN"]);
    return NextResponse.json(await getAdminAnalytics());
  } catch (error) {
    return handleApiError(error);
  }
}
