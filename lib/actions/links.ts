"use server";

import { revalidatePath } from "next/cache";
import { createUntypedClient } from "@/lib/supabase/server-untyped";

type Kind = "reddit" | "nugs" | "billybase" | "bmfsdb" | "other";
const KINDS: Kind[] = ["reddit", "nugs", "billybase", "bmfsdb", "other"];

export async function saveShowLinksAction(args: {
  showId: string;
  bandSlug: string;
  showSlug: string;
  links: Array<{ kind: Kind; url: string; label?: string | null }>;
}) {
  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" };

  const valid = args.links.filter(
    (l) => l.url && l.url.trim() && KINDS.includes(l.kind),
  );

  await supabase.from("show_links").delete().eq("show_id", args.showId);

  if (valid.length > 0) {
    const { error } = await supabase.from("show_links").insert(
      valid.map((l) => ({
        show_id: args.showId,
        kind: l.kind,
        url: l.url.trim(),
        label: l.label?.trim() || null,
      })),
    );
    if (error) return { error: error.message };
  }
  revalidatePath(`/setlists/${args.bandSlug}/${args.showSlug}`);
  return { ok: true };
}
