import { baseApi } from "@/features/api/base-api";
import type { SettingsDTO, UpdateSettingsBody } from "@/types/settings";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<SettingsDTO, void>({
      query: () => "/settings",
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation<SettingsDTO, UpdateSettingsBody>({
      query: (body) => ({ url: "/settings", method: "PATCH", body }),
      invalidatesTags: ["Settings"],
    }),
  }),
});
export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
