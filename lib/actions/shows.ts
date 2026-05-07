"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUntypedClient } from "@/lib/supabase/server-untyped";
import { showSlug, slugify } from "@/lib/slugify";

type AddShowInput = {
  bandSlug: string;
  date: string; // YYYY-MM-DD
  dateEnd?: string | null;
  venue: string;
  city: string;
  state: string;
  isFestival: boolean;
  festivalName?: string | null;
  openerNames: string[];
};

export async function addShowAction(input: AddShowInput) {
  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" } as const;

  // Resolve / create headliner band.
  const { data: headliner } = await supabase
    .from("bands")
    .select("*")
    .eq("slug", input.bandSlug)
    .maybeSingle();
  if (!headliner) return { error: "Unknown band" } as const;

  const slug = showSlug({
    date: input.date,
    venue: input.venue,
    festivalName: input.festivalName,
  });

  const { data: showRow, error: showErr } = await supabase
    .from("shows")
    .insert({
      slug,
      date_start: input.date,
      date_end: input.dateEnd || null,
      venue_name: input.venue || null,
      city: input.city || null,
      state: input.state || null,
      is_festival: input.isFestival,
      festival_name: input.festivalName || null,
      is_verified: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (showErr || !showRow) {
    return { error: showErr?.message ?? "Failed to create show" } as const;
  }

  await supabase
    .from("show_bands")
    .insert({ show_id: showRow.id, band_id: headliner.id, position: 0 });

  for (let i = 0; i < input.openerNames.length; i++) {
    const name = input.openerNames[i].trim();
    if (!name) continue;
    const opSlug = slugify(name);
    const { data: existing } = await supabase
      .from("bands")
      .select("*")
      .eq("slug", opSlug)
      .maybeSingle();
    let opId = existing?.id;
    if (!opId) {
      const { data: created, error: createErr } = await supabase
        .from("bands")
        .insert({ name, slug: opSlug })
        .select()
        .single();
      if (createErr || !created) continue;
      opId = created.id;
    }
    await supabase
      .from("show_bands")
      .insert({ show_id: showRow.id, band_id: opId, position: i + 1 });
  }

  revalidatePath(`/setlists/${input.bandSlug}`);
  redirect(`/setlists/${input.bandSlug}/${showRow.slug}`);
}

type CreateShowInput = {
  date: string;
  dateEnd?: string | null;
  bandNames: string[]; // first entry is the headliner
  venue: string;
  city: string;
  state: string;
  isFestival: boolean;
  festivalName?: string | null;
  notes?: string;
};

export async function createShowAction(input: CreateShowInput) {
  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" } as const;

  const bands = input.bandNames.map((b) => b.trim()).filter(Boolean);
  if (bands.length === 0) return { error: "Add at least one band" } as const;
  if (!input.date) return { error: "Date is required" } as const;

  const slug = showSlug({
    date: input.date,
    venue: input.venue,
    festivalName: input.festivalName,
  });

  const { data: showRow, error: showErr } = await supabase
    .from("shows")
    .insert({
      slug,
      date_start: input.date,
      date_end: input.dateEnd || null,
      venue_name: input.venue || null,
      city: input.city || null,
      state: input.state || null,
      is_festival: input.isFestival,
      festival_name: input.festivalName || null,
      is_verified: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (showErr || !showRow) {
    return { error: showErr?.message ?? "Failed to create show" } as const;
  }

  // Resolve or create each band, link via show_bands.
  let headlinerSlug: string | null = null;
  for (let i = 0; i < bands.length; i++) {
    const name = bands[i];
    const bSlug = slugify(name);
    if (i === 0) headlinerSlug = bSlug;
    const { data: existing } = await supabase
      .from("bands")
      .select("*")
      .eq("slug", bSlug)
      .maybeSingle();
    let bandId = existing?.id;
    if (!bandId) {
      const { data: created, error: createErr } = await supabase
        .from("bands")
        .insert({ name, slug: bSlug })
        .select()
        .single();
      if (createErr || !created) continue;
      bandId = created.id;
    }
    await supabase
      .from("show_bands")
      .insert({ show_id: showRow.id, band_id: bandId, position: i });
  }

  // Optional initial note from the creator.
  if (input.notes && input.notes.trim()) {
    await supabase
      .from("notes")
      .insert({ show_id: showRow.id, user_id: user.id, content: input.notes.trim() });
  }

  if (headlinerSlug) {
    revalidatePath(`/setlists/${headlinerSlug}`);
    redirect(`/setlists/${headlinerSlug}/${showRow.slug}`);
  }
  redirect("/my-shows");
}

export async function verifyShowAction(showId: string) {
  const supabase = await createUntypedClient();
  const { error } = await supabase
    .from("shows")
    .update({ is_verified: true })
    .eq("id", showId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
