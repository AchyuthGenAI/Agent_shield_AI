import type { Source } from "@/lib/firewall";
import { isSource } from "@/lib/firewall";

export interface ProtectedAgentDemo {
  kind: "deterministic-extractive-demo";
  status: "briefed" | "empty" | "blocked";
  source: Source | null;
  receivedCharacters: number;
  passages: string[];
}

type HandoffData = { source: Source; text: string };

function readHandoff(safeHandoff: string): HandoffData {
  const separator = safeHandoff.indexOf("\n");
  if (separator < 0) throw new Error("The protected handoff is malformed.");

  let data: unknown;
  try { data = JSON.parse(safeHandoff.slice(separator + 1)); }
  catch { throw new Error("The protected handoff is malformed."); }

  if (!data || typeof data !== "object") throw new Error("The protected handoff is malformed.");
  const candidate = data as Record<string, unknown>;
  if (!isSource(candidate.source) || typeof candidate.text !== "string" || candidate.text.length > 50_000) {
    throw new Error("The protected handoff is malformed.");
  }
  return { source: candidate.source, text: candidate.text };
}

function excerpt(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 220) return normalized;
  const cut = normalized.lastIndexOf(" ", 217);
  return `${normalized.slice(0, cut > 150 ? cut : 217).trimEnd()}…`;
}

/**
 * A fixed, extractive stand-in for a downstream assistant. The function's only
 * input is the server-created handoff; it has no raw payload, model, or tools.
 */
export function runProtectedAgentDemo(safeHandoff: string | null): ProtectedAgentDemo {
  if (safeHandoff === null) {
    return { kind: "deterministic-extractive-demo", status: "blocked", source: null, receivedCharacters: 0, passages: [] };
  }

  const { source, text } = readHandoff(safeHandoff);
  const approvedText = text.replace(/\[unsafe instruction removed\]/gi, " ").trim();
  const passages = approvedText
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/u)
    .map(excerpt)
    .filter(passage => passage.length >= 8)
    .slice(0, 3);

  return {
    kind: "deterministic-extractive-demo",
    status: passages.length ? "briefed" : "empty",
    source,
    receivedCharacters: approvedText.length,
    passages,
  };
}
