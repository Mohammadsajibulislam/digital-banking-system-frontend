"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiBell } from "react-icons/fi";
import { formatDateTime } from "@/features/transactions/helpers";
import { useAppSelector } from "@/store/hooks";
import type { NotificationDTO } from "@/types/notifications";
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from "./notifications-api";

const QUERY = { page: 1, pageSize: 5, unread: false };

export default function NotificationBell() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { data } = useGetNotificationsQuery(QUERY, { pollingInterval: 30_000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];
  const allHref = `/${(role ?? "customer").toLowerCase()}/notifications`;

  function handleItem(item: NotificationDTO) {
    if (!item.isRead) markRead(item.id);
    setOpen(false);
  }

  const itemBody = (item: NotificationDTO) => (
    <>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-blue-600"}`} />
      <div className="min-w-0">
        <p className={`truncate text-sm ${item.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>{item.title}</p>
        <p className="line-clamp-2 text-xs text-slate-600">{item.message}</p>
        <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
      </div>
    </>
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`} aria-expanded={open}>
        <FiBell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">Notifications</h2><button type="button" disabled={unread === 0 || markingAll} onClick={() => markAll()} className="text-xs font-medium text-blue-700 hover:underline disabled:text-slate-400">Mark all as read</button></div>
          {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">You have no notifications.</p> : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">{items.map((item) => <li key={item.id}>{item.link ? <Link href={item.link} onClick={() => handleItem(item)} className="flex gap-3 px-4 py-3 hover:bg-slate-50">{itemBody(item)}</Link> : <button type="button" onClick={() => handleItem(item)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50">{itemBody(item)}</button>}</li>)}</ul>
          )}
          <Link href={allHref} onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-blue-700 hover:bg-slate-50">View all notifications</Link>
        </div>
      )}
    </div>
  );
}
