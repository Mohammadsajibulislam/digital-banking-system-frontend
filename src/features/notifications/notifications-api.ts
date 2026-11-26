import { baseApi } from "@/features/api/base-api";
import type { NotificationListDTO, NotificationQuery } from "@/types/notifications";

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationListDTO, NotificationQuery>({
      query: ({ page, pageSize, unread }) => ({
        url: "/notifications",
        params: { page, pageSize, ...(unread ? { unread: "true" } : {}) },
      }),
      providesTags: ["Notification"],
    }),
    markNotificationRead: builder.mutation<{ updated: number }, string>({
      query: (id) => ({ url: "/notifications/read", method: "POST", body: { id } }),
      invalidatesTags: ["Notification"],
    }),
    markAllNotificationsRead: builder.mutation<{ updated: number }, void>({
      query: () => ({ url: "/notifications/read", method: "POST", body: { all: true } }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
