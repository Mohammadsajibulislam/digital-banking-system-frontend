import {
  createSlice,
  isRejectedWithValue,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { getErrorMessage } from "@/lib/utils";

interface UiState {
  sidebarOpen: boolean; // mobile drawer
  error: string | null; // centralized error message
}

const initialState: UiState = { sidebarOpen: false, error: null };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Centralized error handling: kono RTK Query mutation fail korle
    // (jemon transfer fail) error ta ekhane ashe, ar ErrorBanner dekhay.
    // Query error (jemon dashboard load) page nijei retry button diye dekhay.
    builder.addMatcher(isRejectedWithValue, (state, action) => {
      const meta = action.meta as unknown as { arg?: { type?: string } };
      if (meta?.arg?.type === "mutation") {
        state.error = getErrorMessage(action.payload);
      }
    });
  },
});

export const { toggleSidebar, closeSidebar, setError } = uiSlice.actions;
export default uiSlice.reducer;