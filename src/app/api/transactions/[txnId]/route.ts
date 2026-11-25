import { NextResponse } from "next/server";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { getTransactionDetail } from "@/lib/services/transactions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ txnId: string }> }
) {
  try {
    const user = await requireUser(["CUSTOMER", "STAFF", "ADMIN"]);
    const { txnId } = await params;
    if (!/^TXN-\d{8}-[A-F0-9]{6}$/.test(txnId)) {
      throw new HttpError(404, "Transaction not found");
    }

    const data = await getTransactionDetail(
      { id: user.id, role: user.role },
      txnId
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
