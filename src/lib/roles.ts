export type AppRole = "ADMIN" | "STAFF" | "CUSTOMER";

// Login-er por kon role kothay jabe
export const ROLE_HOME: Record<AppRole, string> = {
  ADMIN: "/admin",
  STAFF: "/staff",
  CUSTOMER: "/customer",
};