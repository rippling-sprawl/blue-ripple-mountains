"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  if (!email) redirect("/login?error=Missing+email");

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const callback = new URL("/auth/callback", origin);
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/login?sent=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
}
