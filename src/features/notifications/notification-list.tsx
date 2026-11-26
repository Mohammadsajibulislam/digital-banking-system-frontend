"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Pagination from "@/components/ui/pagination";
import { formatDateTime } from "@/features/transactions/helpers";
import type { NotificationDTO } from "@/types/notifications";
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from "./notifications-api";

export default function NotificationList() {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useGetNotificationsQuery({ page, pageSize: 10, unread: unreadOnly });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  useEffect(() => {
    if (data && data.items.length === 0 && page > 1) setPage(data.totalPages);
  }, [data, page]);

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;
  const body = (item: NotificationDTO) => (
    <>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-blue-600"}`} />
      <div className="min-w-0"><p className={`text-sm ${item.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>{item.title}</p><p className="mt-0.5 text-sm text-slate-600">{item.message}</p><p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p></div>
    </>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold text-slate-900">Notifications</h1><p className="text-sm text-slate-500">{unread > 0 ? `${unread} unread` : "You are all caught up."}</p></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-slate-300" />Unread only</label><button type="button" disabled={unread === 0 || markingAll} onClick={() => markAll()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Mark all as read</button></div></div>
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load notifications.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white">Retry</button></div>}
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${isFetching ? "opacity-60" : ""}`}>
        {isLoading ? <div className="space-y-3 p-5">{[0,1,2,3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-200" />)}</div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{unreadOnly ? "No unread notifications." : "No notifications yet."}</p> : (
          <ul className="divide-y divide-slate-100">{items.map((item) => <li key={item.id}>{item.link ? <Link href={item.link} onClick={() => { if (!item.isRead) markRead(item.id); }} className="flex gap-3 px-5 py-4 hover:bg-slate-50">{body(item)}</Link> : <button type="button" onClick={() => { if (!item.isRead) markRead(item.id); }} className="flex w-full gap-3 px-5 py-4 text-left hover:bg-slate-50">{body(item)}</button>}</li>)}</ul>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} disabled={isFetching} onPageChange={setPage} />}
      </div>
    </div>
  );
}
