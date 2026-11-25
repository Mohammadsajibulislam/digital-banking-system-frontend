import { NextResponse } from "next/server";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { verifyCustomer } from "@/lib/services/management";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["ADMIN", "STAFF"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Customer not found");
    return NextResponse.json(await verifyCustomer(user.id, id));
  } catch (error) {
    return handleApiError(error);
  }
}
