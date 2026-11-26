import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/auth-guard";
import { getAccountDetails } from "@/lib/services/account-details";

export async function GET() {
  try {
    const user = await requireUser(["CUSTOMER"]);
    return NextResponse.json(await getAccountDetails(user.id));
  } catch (error) {
    return handleApiError(error);
  }
}
