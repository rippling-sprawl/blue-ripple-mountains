// Same Supabase server client, but typed as the bare PostgREST client so that
// mutations don't need to satisfy the generated Database generic. Reads still
// cast their result shapes explicitly. Use only inside server actions / route
// handlers where you already know the runtime shape.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";

export async function createUntypedClient(): Promise<SupabaseClient> {
  const c = await createClient();
  return c as unknown as SupabaseClient;
}
