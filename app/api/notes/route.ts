import { NextResponse, type NextRequest } from "next/server";
import { createUntypedClient } from "@/lib/supabase/server-untyped";

// Used by both Server Actions and the navigator.sendBeacon flush on mobile
// page-hide. Body shape: { show_id: string, content: string }.
export async function POST(request: NextRequest) {
  let body: unknown;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    // sendBeacon defaults to text/plain
    const text = await request.text();
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const { show_id, content } = (body ?? {}) as {
    show_id?: string;
    content?: string;
  };
  if (!show_id || typeof content !== "string") {
    return NextResponse.json({ error: "Missing show_id or content" }, { status: 400 });
  }

  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("notes")
    .upsert(
      { show_id, user_id: user.id, content },
      { onConflict: "show_id,user_id" },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
