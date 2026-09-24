import type { Source } from "@/lib/firewall";
import { isSource } from "@/lib/firewall";

export interface ProtectedAgentDemo {
  kind: "local-tool-based-analyst";
  status: "briefed" | "empty" | "blocked";
  source: Source | null;
  receivedCharacters: number;
  question: string;
  answer: string;
  passages: string[];
  evidence: { reference: number; text: string }[];
  toolTrace: { name: string; detail: string }[];
}

type HandoffData = { source: Source; text: string };
type Passage = { reference: number; text: string; words: Set<string> };

const DEFAULT_QUESTION = "What are the key facts?";
const STOP_WORDS = new Set(["about", "after", "also", "and", "are", "can", "did", "does", "for", "from", "how", "into", "is", "its", "main", "most", "our", "that", "the", "their", "there", "these", "this", "those", "was", "were", "what", "when", "where", "which", "who", "why", "with", "would"]);

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

function words(value: string): Set<string> {
  return new Set((value.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter(word => !STOP_WORDS.has(word)));
}

/** Local read-only tool: index passages in the approved handoff. */
function indexApprovedPassages(text: string): Passage[] {
  return text
    .replace(/\[unsafe instruction removed\]/gi, " ")
    .split(/\n+|(?<=[.!?])\s+(?=[\p{Lu}\p{N}])/u)
    .map(part => part.replace(/\s+/g, " ").trim())
    .filter(part => part.length >= 8)
    .slice(0, 120)
    .map((part, index) => ({ reference: index + 1, text: part.slice(0, 320), words: words(part) }));
}

/** Local read-only tool: rank evidence for a user-controlled question. */
function searchApprovedPassages(passages: Passage[], question: string): Passage[] {
  const query = words(question);
  const broadBrief = /\b(?:summari[sz]e|brief|overview|key facts|main points|takeaways)\b/i.test(question) || query.size === 0;
  return passages
    .map(passage => {
      let overlap = 0;
      for (const word of query) if (passage.words.has(word)) overlap += 1;
      const score = broadBrief ? overlap * 4 + (/[\d%$]/.test(passage.text) ? 2 : 0) + Math.min(passage.words.size, 15) / 15 : overlap;
      return { passage, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.passage.reference - b.passage.reference)
    .slice(0, 3)
    .map(item => item.passage)
    .sort((a, b) => a.reference - b.reference);
}

/** Local composition tool: quote evidence without adding unsupported claims. */
function composeGroundedAnswer(evidence: Passage[]): string {
  return evidence.map(item => `${item.text} [${item.reference}]`).join(" ");
}

/**
 * A narrow task agent: it indexes, searches and answers from the server-created
 * safe handoff. It cannot browse, call a model, or read the raw source request.
 */
export function runProtectedAgentDemo(safeHandoff: string | null, userQuestion = DEFAULT_QUESTION): ProtectedAgentDemo {
  const question = userQuestion.trim() || DEFAULT_QUESTION;
  if (safeHandoff === null) {
    return {
      kind: "local-tool-based-analyst", status: "blocked", source: null, receivedCharacters: 0, question,
      answer: "The firewall quarantined this input. The protected analyst received no source text and cannot answer from it.",
      passages: [], evidence: [], toolTrace: [{ name: "Firewall gate", detail: "Blocked: no approved handoff was available." }],
    };
  }

  const { source, text } = readHandoff(safeHandoff);
  const approvedText = text.replace(/\[unsafe instruction removed\]/gi, " ").trim();
  const indexed = indexApprovedPassages(approvedText);
  const selected = searchApprovedPassages(indexed, question);
  const evidence = selected.map(({ reference, text }) => ({ reference, text }));
  return {
    kind: "local-tool-based-analyst",
    status: selected.length ? "briefed" : "empty",
    source,
    receivedCharacters: approvedText.length,
    question,
    answer: selected.length ? composeGroundedAnswer(selected) : "I could not find evidence for that question in the approved content.",
    passages: selected.map(item => item.text),
    evidence,
    toolTrace: [
      { name: "Index approved text", detail: `${indexed.length} passages indexed from the server-created handoff.` },
      { name: "Search evidence", detail: `${selected.length} passages matched the trusted question.` },
      { name: "Compose answer", detail: selected.length ? "Answer assembled only from cited approved passages." : "No answer generated without matching evidence." },
    ],
  };
}
