import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface RequestFilters {
  status: string;
  type: string;
  page: number;
  pageSize: number;
}

const initialState: RequestFilters = { status: "", type: "", page: 1, pageSize: 10 };

const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    setRequestStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
      state.page = 1;
    },
    setRequestType(state, action: PayloadAction<string>) {
      state.type = action.payload;
      state.page = 1;
    },
    setRequestPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
  },
});

export const { setRequestStatus, setRequestType, setRequestPage } = requestsSlice.actions;
export default requestsSlice.reducer;
