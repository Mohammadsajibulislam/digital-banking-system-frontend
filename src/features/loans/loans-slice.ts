import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface LoanFilters {
  status: string;
  page: number;
  pageSize: number;
}

const initialState: LoanFilters = { status: "", page: 1, pageSize: 10 };

const loansSlice = createSlice({
  name: "loans",
  initialState,
  reducers: {
    setLoanStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
      state.page = 1;
    },
    setLoanPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
  },
});

export const { setLoanStatus, setLoanPage } = loansSlice.actions;
export default loansSlice.reducer;
