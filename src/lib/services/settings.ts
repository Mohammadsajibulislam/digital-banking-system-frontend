import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";

export interface SettingsInput {
  dailyTransferLimit: string;
  maxSingleTransaction: string;
  minAccountBalance: string;
  transferFee: string;
}

const FIELDS = ["dailyTransferLimit", "maxSingleTransaction", "minAccountBalance", "transferFee"] as const;

async function ensureRow() {
  return prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      dailyTransferLimit: 200000,
      maxSingleTransaction: 100000,
      minAccountBalance: 500,
      transferFee: 5,
    },
  });
}

function toDto(row: Awaited<ReturnType<typeof ensureRow>>) {
  return {
    dailyTransferLimit: row.dailyTransferLimit.toFixed(2),
    maxSingleTransaction: row.maxSingleTransaction.toFixed(2),
    minAccountBalance: row.minAccountBalance.toFixed(2),
    transferFee: row.transferFee.toFixed(2),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function readSettings() {
  return toDto(await ensureRow());
}

export async function updateSettings(adminId: string, input: SettingsInput) {
  const next = {
    dailyTransferLimit: new Prisma.Decimal(input.dailyTransferLimit),
    maxSingleTransaction: new Prisma.Decimal(input.maxSingleTransaction),
    minAccountBalance: new Prisma.Decimal(input.minAccountBalance),
    transferFee: new Prisma.Decimal(input.transferFee),
  };
  if (next.dailyTransferLimit.lte(0) || next.maxSingleTransaction.lte(0)) {
    throw new HttpError(422, "Daily limit and maximum per transaction must be more than 0");
  }
  if (next.maxSingleTransaction.gt(next.dailyTransferLimit)) {
    throw new HttpError(422, "Maximum per transaction cannot be more than the daily transfer limit");
  }
  if (next.transferFee.gt(10000)) {
    throw new HttpError(422, "Transfer fee cannot be more than 10000 BDT");
  }
  if (next.minAccountBalance.lt(0)) {
    throw new HttpError(422, "Minimum account balance cannot be negative");
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.systemSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    const changes: Record<string, { from: string; to: string }> = {};
    for (const field of FIELDS) {
      if (!current[field].equals(next[field])) {
        changes[field] = { from: current[field].toFixed(2), to: next[field].toFixed(2) };
      }
    }
    if (Object.keys(changes).length === 0) throw new HttpError(400, "Nothing was changed");
    const updated = await tx.systemSetting.update({ where: { id: 1 }, data: next });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "SETTINGS_UPDATED",
        entity: "SystemSetting",
        entityId: "1",
        metadata: { changes },
      },
    });
    return toDto(updated);
  });
}
