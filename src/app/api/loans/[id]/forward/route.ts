import { NextResponse } from "next/server";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { forwardLoan } from "@/lib/services/loans";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(["STAFF"]);
    const { id } = await params;
    if (!id || id.length > 40) throw new HttpError(404, "Loan not found");
    return NextResponse.json(await forwardLoan(user.id, id));
  } catch (error) {
    return handleApiError(error);
  }
}
