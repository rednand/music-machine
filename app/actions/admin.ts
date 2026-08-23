"use server";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { getIsAdmin } from "../lib/auth";

export type DeleteAlbumResult = { state: "ready" } | { state: "error"; message: string };

export async function deleteAlbum(albumId: string): Promise<DeleteAlbumResult> {
  const supabase = await createSupabaseServerClient();
  const isAdmin = await getIsAdmin(supabase);

  if (!isAdmin) {
    return { state: "error", message: "Não autorizado." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("delete_album_cascade", { target_album_id: albumId });

  if (error) {
    console.error("Failed to delete album", { albumId, error });
    return { state: "error", message: "Não foi possível excluir este álbum." };
  }

  return { state: "ready" };
}
