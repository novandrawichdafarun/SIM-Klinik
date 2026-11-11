"use client";

import { useEffect } from "react";
import type { ActionResponse } from "@/types/action";
import { toast } from "./toast";

/**
 * Tampilkan hasil server action sebagai toast, otomatis setiap kali `state` berubah:
 *  - gagal  → toast error berisi pesan dari server
 *  - sukses → toast sukses berisi `message` (bila ada)
 * Dipakai bersama useActionState:  const [state, action] = useActionState(...); useFeedbackAksi(state);
 */
export function useFeedbackAksi(state: ActionResponse | null | undefined) {
  useEffect(() => {
    if (!state) return;
    if (!state.success) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}
