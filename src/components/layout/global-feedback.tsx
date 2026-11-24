"use client";

import { FiX } from "react-icons/fi";
import { setError } from "@/features/ui/ui-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store/store";

// Centralized loading state: RTK Query-r kono query ba mutation
// pending thakle ei selector true dey.
const selectIsAnyRequestPending = (state: RootState) =>
  Object.values(state.api.queries).some((q) => q?.status === "pending") ||
  Object.values(state.api.mutations).some((m) => m?.status === "pending");

export function GlobalLoadingBar() {
  const pending = useAppSelector(selectIsAnyRequestPending);
  if (!pending) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-1 animate-pulse bg-blue-600"
      role="progressbar"
      aria-label="Loading"
    />
  );
}

export function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.ui.error);
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:px-6"
    >
      <span>{error}</span>
      <button
        type="button"
        onClick={() => dispatch(setError(null))}
        aria-label="Dismiss error"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
}