import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface FlagFilters { status: string; page: number; pageSize: number }
const initialState: FlagFilters = { status: "", page: 1, pageSize: 10 };

const flagsSlice = createSlice({
  name: "flags",
  initialState,
  reducers: {
    setFlagStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
      state.page = 1;
    },
    setFlagPage(state, action: PayloadAction<number>) { state.page = action.payload; },
  },
});
export const { setFlagStatus, setFlagPage } = flagsSlice.actions;
export default flagsSlice.reducer;
