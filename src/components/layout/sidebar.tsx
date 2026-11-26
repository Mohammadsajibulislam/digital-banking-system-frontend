"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiShield, FiX } from "react-icons/fi";
import { closeSidebar } from "@/features/ui/ui-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AppRole } from "@/lib/roles";
import { NAV_ITEMS } from "./nav-config";

export default function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.sidebarOpen);
  const items = NAV_ITEMS[role];
  const homeHref = `/${role.toLowerCase()}`;

  // Dashboard exact match, baki gulo prefix match
  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Mobile-e drawer khulle pichoner overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => dispatch(closeSidebar())}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0f172a] text-[#cbd5e1] transition-transform dark:border-r dark:border-[#1e293b] dark:bg-[#070d1c] lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#1e293b] px-5">
          <div className="flex items-center gap-2 text-white">
            <FiShield className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-semibold tracking-tight">
              Digital Bank
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(closeSidebar())}
            className="rounded p-1 text-[#94a3b8] hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => dispatch(closeSidebar())}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "hover:bg-[#1e293b] hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#1e293b] px-5 py-4 text-xs text-[#64748b]">
          Simulated banking system. No real money.
        </div>
      </aside>
    </>
  );
}