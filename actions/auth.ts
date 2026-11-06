"use server";

import {
  requestOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "@/schemas/auth.schema";
import {
  clearDbSessionService,
  requestPasswordReset,
  ResetPassword,
  verifyOtp,
} from "@/services/auth.service";
import { ActionResponse } from "@/types/action";
import { handleActionError } from "@/utils/error";
import { validateFormData } from "@/utils/validation";

export async function clearDbSessionAction(
  sessionToken: string,
): Promise<ActionResponse> {
  try {
    return await clearDbSessionService(sessionToken);
  } catch (error) {
    return handleActionError(error, "Gagal menghapus sesi database.");
  }
}

export async function requestOtpAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { data, error } = validateFormData(formData, requestOtpSchema);

    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };

    return await requestPasswordReset(data.email);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function verifyOtpAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { data, error } = validateFormData(formData, verifyOtpSchema);

    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };

    return await verifyOtp(data);
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const { data, error } = validateFormData(formData, resetPasswordSchema);

    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };

    return await ResetPassword(data);
  } catch (error) {
    return handleActionError(error);
  }
}
