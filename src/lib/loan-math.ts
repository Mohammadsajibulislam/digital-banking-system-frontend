export const LOAN_LIMITS = {
  minAmount: 5000,
  maxAmount: 2000000,
  minMonths: 3,
  maxMonths: 60,
  maxOpenApplications: 2,
} as const;

export const INDICATIVE_RATE = 12;

export function estimateEmi(principal: number, months: number, yearlyRate: number) {
  if (!principal || !months || principal < 0) return 0;
  const r = yearlyRate / 12 / 100;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}
