import { NextResponse } from "next/server";
import { inspectContent } from "@/lib/firewall";
import { fixtures } from "@/lib/fixtures";

export const runtime = "nodejs";

export function GET() {
  const cases = fixtures.map(fixture => {
    const result = inspectContent(fixture.content, fixture.source);
    const detected = result.decision !== "allow";
    return { id: fixture.id, label: fixture.label, category: fixture.category, source: fixture.source, expected: fixture.expected, decision: result.decision, risk: result.risk, correct: (fixture.expected === "intercept") === detected, categoryMatched: fixture.expected === "allow" ? null : result.findings.some(item => item.category === fixture.category) };
  });
  const attacks = cases.filter(item => item.expected === "intercept");
  const benign = cases.filter(item => item.expected === "allow");
  return NextResponse.json({
    title: "Curated fixture checks",
    note: "These controlled examples show behavior, not a real-world accuracy guarantee.",
    cases,
    metrics: { total: cases.length, correct: cases.filter(item => item.correct).length, attacksIntercepted: attacks.filter(item => item.correct).length, attacksTotal: attacks.length, benignPassed: benign.filter(item => item.correct).length, benignTotal: benign.length, categoriesMatched: attacks.filter(item => item.categoryMatched).length },
  }, { headers: { "Cache-Control": "no-store" } });
}
