import { ActionResponse } from "@/types/action";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const shouldLogError = process.env.NODE_ENV !== "production";

export function handleActionError<T = void>(
  error: unknown,
  fallbackMessage: string = "Terjadi kesalahan internal server",
): ActionResponse<T> {
  if (isRedirectError(error)) {
    throw error;
  }

  if (shouldLogError) {
    console.error("[SERVER ACTION ERROR]:", error);
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : fallbackMessage,
  };
}

export function handleServiceError<T = void>(
  error: unknown,
  fallbackMessage: string = "Terjadi kesalahan internal service",
): ActionResponse<T> {
  if (isRedirectError(error)) {
    throw error;
  }

  if (shouldLogError) {
    console.error("[SYSTEM ERROR]:", error);
  }

  return { success: false, error: fallbackMessage };
}
