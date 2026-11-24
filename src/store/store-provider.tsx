"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";
import type { AuthUser } from "@/features/auth/auth-slice";

export default function StoreProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  // useState-er initializer ekbar-i chole, tai store bar bar toiri hoy na
  const [store] = useState(() => makeStore(user));
  return <Provider store={store}>{children}</Provider>;
}