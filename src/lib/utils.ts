const moneyFormatter = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatMoney(value: string | number) {
  return moneyFormatter.format(Number(value));
}

export function formatDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// RTK Query-r error theke user-ke dekhanor moto message ber kore
export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const e = error as { data?: unknown; error?: unknown; message?: unknown };
    if (typeof e.data === "object" && e.data !== null) {
      const apiError = (e.data as { error?: unknown }).error;
      if (typeof apiError === "string") return apiError;
    }
    if (typeof e.error === "string") return e.error;
    if (typeof e.message === "string") return e.message;
  }
  return "Something went wrong. Please try again.";
}