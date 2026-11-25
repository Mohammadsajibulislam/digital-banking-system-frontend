import type { TransactionDetailDTO } from "@/types/transactions";
import { TYPE_LABELS, formatDateTime } from "@/features/transactions/helpers";

const money = (value: string | number) =>
  `BDT ${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export async function downloadReceipt(tx: TransactionDetailDTO) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const width = doc.internal.pageSize.getWidth();
  const left = 12;
  const right = width - 12;

  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, width, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Digital Bank", left, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Transaction Receipt", left, 22);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(money(tx.amount), left, 44);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Status: ${tx.status}`, left, 51);

  const rows: [string, string][] = [
    ["Reference (Transaction ID)", tx.txnId],
    ["Date", formatDateTime(tx.createdAt)],
    ["Type", TYPE_LABELS[tx.type] ?? tx.type],
    ["From", tx.fromAccountNumber ? `${tx.fromName ?? ""} (${tx.fromAccountNumber})` : "Bank"],
    ["To", tx.toAccountNumber ? `${tx.toName ?? ""} (${tx.toAccountNumber})` : "Bank"],
    ["Amount", money(tx.amount)],
    ["Fee", money(tx.fee)],
    ["Total", money(Number(tx.amount) + Number(tx.fee))],
  ];
  if (tx.description) rows.push(["Description", tx.description]);
  if (tx.failureReason) rows.push(["Failure reason", tx.failureReason]);

  let y = 62;
  for (const [label, value] of rows) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, left, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(value, 70) as string[];
    doc.text(lines, right, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += Math.max(1, lines.length) * 5 + 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(left, y - 3.5, right, y - 3.5);
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This is a simulated banking system. No real money is involved.",
    left,
    doc.internal.pageSize.getHeight() - 10
  );
  doc.save(`receipt-${tx.txnId}.pdf`);
}
