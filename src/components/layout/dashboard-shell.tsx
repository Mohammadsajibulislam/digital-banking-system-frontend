import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StoreProvider from "@/store/store-provider";
import type { AppRole } from "@/lib/roles";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { ErrorBanner, GlobalLoadingBar } from "./global-feedback";

export default async function DashboardShell({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    id: session.user.id,
    name: session.user.name ?? "User",
    email: session.user.email ?? "",
    role: session.user.role,
  };

  return (
    <StoreProvider user={user}>
      <GlobalLoadingBar />
      <div className="min-h-screen bg-slate-50 lg:flex">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <ErrorBanner />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}