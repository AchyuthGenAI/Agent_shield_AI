"use client";

import { ArrowRight, Braces, FileInput, Fingerprint, LockKeyhole, Route, ShieldCheck } from "lucide-react";

const steps = [
  { icon: FileInput, title: "1. Intake", body: "A message, document, tool result, or image is converted to text before the protected agent can read it." },
  { icon: Fingerprint, title: "2. Normalize", body: "The firewall checks Unicode, HTML entities, Base64, URL encoding, and ROT13 to expose concealed instructions." },
  { icon: Route, title: "3. Inspect", body: "A local intent classifier and source-aware rules look for role spoofing, exfiltration, tool calls, and other patterns." },
  { icon: ShieldCheck, title: "4. Enforce", body: "The decision is allow, remove unsafe spans, or quarantine. Only remaining safe text can proceed." },
  { icon: LockKeyhole, title: "5. Handoff", body: "Allowed text is wrapped as untrusted task data. The response includes evidence and a reviewable decision trail." },
];

export function ArchitecturePanel() {
  return <section className="detail-surface" aria-labelledby="architecture-heading">
    <div className="detail-title"><div className="heading-icon"><Braces size={20} /></div><div><span className="detail-kicker">UNDER THE HOOD</span><h2 id="architecture-heading">How protection works</h2><p>Every input follows the same bounded path before it can influence an agent.</p></div></div>
    <div className="architecture-flow">{steps.map((step, index) => <div className="flow-step" key={step.title}><span className="flow-icon"><step.icon size={19} /></span><h3>{step.title}</h3><p>{step.body}</p>{index < steps.length - 1 && <ArrowRight className="flow-arrow" size={18} />}</div>)}</div>
    <div className="architecture-bottom"><div><h3>Use it in an agent pipeline</h3><p>Send content to the inspection endpoint and pass only <code>safeHandoff</code> to your model when the decision permits it. Quarantined content has no handoff value.</p></div><pre>{"POST /api/inspect\nContent-Type: application/json\n\n{\"source\":\"web\",\"content\":\"...\"}\n\n→ decision: allow | sanitize | quarantine\n→ findings, risk, safeHandoff, stages"}</pre></div>
    <p className="architecture-note">This is a demonstration firewall. The small local model and rules can miss novel attacks. Human review and downstream tool permissions remain important.</p>
  </section>;
}
