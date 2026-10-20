import { NextResponse } from "next/server";
import { searchMedia } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const type = (searchParams.get("type") === "tv" ? "tv" : "movie") as "movie" | "tv";
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const results = await searchMedia(q, type);
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
