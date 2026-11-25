import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CustomerFilters { q: string; status: string; verified: string; page: number; pageSize: number }
const initialState: CustomerFilters = { q: "", status: "", verified: "", page: 1, pageSize: 10 };

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    setCustomerFilters(state, action: PayloadAction<Partial<Pick<CustomerFilters, "q" | "status" | "verified">>>) {
      Object.assign(state, action.payload);
      state.page = 1;
    },
    setCustomerPage(state, action: PayloadAction<number>) { state.page = action.payload; },
  },
});
export const { setCustomerFilters, setCustomerPage } = customersSlice.actions;
export default customersSlice.reducer;
