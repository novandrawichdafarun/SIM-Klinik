"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProfileService } from "@/services/profile.service";
import { ActionResponse } from "@/types/action";
import { UserProfile } from "@/types/profile";
import { handleActionError } from "@/utils/error";

export async function getProfileAction(): Promise<ActionResponse<UserProfile>> {
  try {
    // ID user diambil dari session di server, BUKAN dari parameter client,
    // supaya user tidak bisa meminta profil milik akun lain.
    const session = await getServerSession(authOptions);
    const idUser = session?.user?.id;

    if (!idUser) {
      return { success: false, error: "Sesi tidak valid. Silakan login ulang." };
    }

    return await getProfileService(idUser);
  } catch (error) {
    return handleActionError(error, "Gagal mengambil profil.");
  }
}
