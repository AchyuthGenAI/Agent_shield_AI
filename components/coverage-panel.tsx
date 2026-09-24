"use client";

import { useEffect, useState } from "react";
import { Check, FlaskConical, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fixtures, type Fixture } from "@/lib/fixtures";
import { categories } from "@/lib/firewall";

type Evaluation = {
  note: string;
  metrics: { total: number; correct: number; attacksIntercepted: number; attacksTotal: number; benignPassed: number; benignTotal: number; categoriesMatched: number };
  cases: { id: string; category: string; expected: string; decision: string; correct: boolean; categoryMatched: boolean | null }[];
};

export function CoveragePanel({ onTry }: { onTry: (fixture: Fixture) => void }) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/evaluate").then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<Evaluation>; }).then(setEvaluation).catch(() => setError("Fixture results are temporarily unavailable.")); }, []);
  return <section className="detail-surface" aria-labelledby="coverage-heading">
    <div className="detail-title"><div className="heading-icon"><FlaskConical size={20} /></div><div><span className="detail-kicker">EVIDENCE</span><h2 id="coverage-heading">Detection coverage</h2><p>Controlled attack and benign examples for every category in the challenge.</p></div></div>
    {error && <p role="alert" className="error-message">{error}</p>}
    {!evaluation ? <p className="quiet-note">Running the fixture checks…</p> : <>
      <div className="metric-grid"><div><strong>{evaluation.metrics.attacksIntercepted}/{evaluation.metrics.attacksTotal}</strong><span>Attack examples intercepted</span></div><div><strong>{evaluation.metrics.benignPassed}/{evaluation.metrics.benignTotal}</strong><span>Benign examples passed</span></div><div><strong>{evaluation.metrics.categoriesMatched}/{categories.length}</strong><span>Attack types identified</span></div></div>
      <p className="metric-note">{evaluation.note} All examples are fictional and contain no real credentials or destinations.</p>
      <div className="coverage-list">{categories.map(category => {
        const attack = evaluation.cases.find(item => item.category === category && item.expected === "intercept");
        const benign = evaluation.cases.find(item => item.category === category && item.expected === "allow");
        const fixture = fixtures.find(item => item.category === category && item.expected === "intercept");
        return <div className="coverage-row" key={category}><span className="coverage-shield"><ShieldCheck size={18} /></span><div className="coverage-name"><strong>{category}</strong><small>One attack + one benign lookalike</small></div><div className="coverage-outcomes"><span className={attack?.correct ? "outcome-good" : "outcome-bad"}>{attack?.correct ? <Check size={13} /> : <ShieldX size={13} />} Attack {attack?.correct ? "caught" : "missed"}</span><span className={benign?.correct ? "outcome-good" : "outcome-bad"}>{benign?.correct ? <Check size={13} /> : <ShieldX size={13} />} Benign {benign?.correct ? "passed" : "flagged"}</span></div>{fixture && <Button variant="outline" size="sm" onClick={() => onTry(fixture)}>Try example</Button>}</div>;
      })}</div>
    </>}
  </section>;
}
