import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/roles";

// Session ar User-e role ar id rakhar jonno TypeScript-ke bole dei
declare module "next-auth" {
  interface User {
    role: AppRole;
  }
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}