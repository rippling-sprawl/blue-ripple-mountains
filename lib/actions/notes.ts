"use server";

import { revalidatePath } from "next/cache";
import { createUntypedClient } from "@/lib/supabase/server-untyped";

export async function setFriendTagsAction(args: {
  showId: string;
  bandSlug: string;
  showSlug: string;
  tags: Array<{ user_id?: string | null; display_name?: string | null }>;
}) {
  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" };

  // Ensure the user's note exists; tags FK to it.
  const { data: existing } = await supabase
    .from("notes")
    .select("id")
    .eq("show_id", args.showId)
    .eq("user_id", user.id)
    .maybeSingle();

  let noteId = existing?.id;
  if (!noteId) {
    const { data: created, error: createErr } = await supabase
      .from("notes")
      .insert({ show_id: args.showId, user_id: user.id, content: "" })
      .select("id")
      .single();
    if (createErr || !created) return { error: createErr?.message ?? "Failed" };
    noteId = created.id;
  }

  await supabase.from("note_tagged_friends").delete().eq("note_id", noteId);

  const valid = args.tags.filter(
    (t) => (t.user_id && t.user_id.trim()) || (t.display_name && t.display_name.trim()),
  );
  if (valid.length > 0) {
    await supabase.from("note_tagged_friends").insert(
      valid.map((t) => ({
        note_id: noteId!,
        user_id: t.user_id || null,
        display_name: t.display_name || null,
      })),
    );
  }

  revalidatePath(`/setlists/${args.bandSlug}/${args.showSlug}`);
  return { ok: true };
}
