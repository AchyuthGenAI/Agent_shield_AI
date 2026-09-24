import { NextRequest, NextResponse } from "next/server";
import { inspectContent, isSource } from "@/lib/firewall";
import { runProtectedAgentDemo } from "@/lib/protected-agent";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 }); }

  if (!input || typeof input !== "object") return NextResponse.json({ error: "Request body is required." }, { status: 400 });
  const { content, source, question } = input as Record<string, unknown>;
  if (typeof content !== "string" || !content.trim()) return NextResponse.json({ error: "Add content to inspect." }, { status: 400 });
  if (content.length > 50_000) return NextResponse.json({ error: "Content is too long. Keep it below 50,000 characters." }, { status: 413 });
  if (!isSource(source)) return NextResponse.json({ error: "Choose a supported source." }, { status: 400 });
  if (question !== undefined && (typeof question !== "string" || question.length > 240)) {
    return NextResponse.json({ error: "Keep the analyst question below 240 characters." }, { status: 400 });
  }

  const inspection = inspectContent(content, source);
  const protectedAgent = runProtectedAgentDemo(inspection.safeHandoff, question as string | undefined);
  return NextResponse.json({ ...inspection, protectedAgent }, { headers: { "Cache-Control": "no-store" } });
}
