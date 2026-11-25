import { baseApi } from "@/features/api/base-api";
import type { AdminDashboardDTO, StaffDashboardDTO } from "@/types/analytics";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<AdminDashboardDTO, void>({
      query: () => "/dashboard/admin",
      providesTags: ["Dashboard", "Account", "Transaction", "Loan"],
    }),
    getStaffDashboard: builder.query<StaffDashboardDTO, void>({
      query: () => "/dashboard/staff",
      providesTags: ["Dashboard", "Request", "Loan", "Transaction"],
    }),
  }),
});

export const { useGetAdminDashboardQuery, useGetStaffDashboardQuery } = dashboardApi;
