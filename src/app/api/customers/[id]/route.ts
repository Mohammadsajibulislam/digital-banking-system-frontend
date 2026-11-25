import { NextResponse } from "next/server";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { getCustomerDetail } from "@/lib/services/management";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(["ADMIN", "STAFF"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Customer not found");
    return NextResponse.json(await getCustomerDetail(id));
  } catch (error) {
    return handleApiError(error);
  }
}
