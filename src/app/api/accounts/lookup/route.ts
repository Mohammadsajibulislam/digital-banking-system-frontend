import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";
import { getSettings, maskName } from "@/lib/services/transfer";

// Production-e ekhane rate limit lagano uchit, noile keu account number
// ghuriye ghuriye valid account khuje ber korte pare.
export async function GET(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER"]);

    const accountNumber =
      new URL(req.url).searchParams.get("accountNumber") ?? "";
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new HttpError(400, "Account number must be 10 digits");
    }

    const account = await prisma.account.findUnique({
      where: { accountNumber },
      select: {
        accountNumber: true,
        type: true,
        status: true,
        ownerId: true,
        owner: { select: { name: true, status: true } },
      },
    });

    // "Nai", "frozen", "blocked owner" sob-e ek message, jate extra info na jay
    if (
      !account ||
      account.status !== "ACTIVE" ||
      account.owner.status !== "ACTIVE"
    ) {
      throw new HttpError(404, "Recipient account not found");
    }

    const settings = await getSettings();
    const isOwnAccount = account.ownerId === user.id;

    return NextResponse.json({
      accountNumber: account.accountNumber,
      accountType: account.type,
      ownerName: isOwnAccount ? account.owner.name : maskName(account.owner.name),
      isOwnAccount,
      fee: isOwnAccount ? "0" : settings.transferFee.toString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}