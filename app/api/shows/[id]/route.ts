import { NextResponse } from "next/server";

const NUGS_API = "https://catalog.nugs.net/api/v1/shows/";

export const revalidate = 900; // 15 minutes

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    const upstream = await fetch(NUGS_API + id, {
      headers: { "User-Agent": "blueripplemountains/1.0" },
      next: { revalidate: 900 },
    });
    if (!upstream.ok) {
      return new NextResponse(await upstream.text(), {
        status: upstream.status,
      });
    }
    const body = await upstream.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=900",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `upstream error: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
