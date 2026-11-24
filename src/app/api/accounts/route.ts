import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireUser } from "@/lib/auth-guard";

// Customer shudhu nijer account gulo dekhte pabe
export async function GET() {
  try {
    const user = await requireUser(["CUSTOMER"]);

    const accounts = await prisma.account.findMany({
      where: { ownerId: user.id }, // ownership: shudhu nijer
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        accountNumber: true,
        type: true,
        status: true,
        balance: true, // Decimal JSON-e string hoye jay
        currency: true,
        createdAt: true,
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    return handleApiError(error);
  }
}