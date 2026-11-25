import { NextResponse } from "next/server";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { getLoanDetail } from "@/lib/services/loans";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["CUSTOMER", "STAFF", "ADMIN"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Loan not found");
    return NextResponse.json(await getLoanDetail({ id: user.id, role: user.role }, id));
  } catch (error) {
    return handleApiError(error);
  }
}
