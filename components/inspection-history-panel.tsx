"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Clock3, History, LockKeyhole, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { sources, type Decision } from "@/lib/firewall";
import type { SavedInspection } from "@/lib/inspection-history";

type Props = {
  records: SavedInspection[];
  status: "loading" | "ready" | "unavailable";
  error: string;
  onOpen: (record: SavedInspection) => void;
  onInspect: () => void;
  onDelete: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
};

const filters: { id: "all" | Decision; label: string }[] = [
  { id: "all", label: "All" },
  { id: "allow", label: "Allow" },
  { id: "sanitize", label: "Sanitize" },
  { id: "quarantine", label: "Quarantine" },
];

function titleFor(record: SavedInspection): string {
  const firstLine = record.content.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? "Untitled inspection";
  return firstLine.length > 88 ? `${firstLine.slice(0, 88).trimEnd()}…` : firstLine;
}

function dateFor(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function InspectionHistoryPanel({ records, status, error, onOpen, onInspect, onDelete, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | "all" | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return records.filter(record => {
      if (filter !== "all" && record.result.decision !== filter) return false;
      if (!term) return true;
      return [record.content, record.question, record.source, record.result.decision, ...record.result.findings.map(finding => finding.category)].some(value => value.toLocaleLowerCase().includes(term));
    });
  }, [records, query, filter]);
  const selected = visible.find(record => record.id === selectedId) ?? visible[0] ?? null;
  const targetRecord = records.find(record => record.id === deleteTarget);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget === "all") await onClear();
      else await onDelete(deleteTarget);
      setDeleteTarget(null);
    } catch { /* The parent shows the storage error and keeps this dialog open. */ }
    finally { setDeleting(false); }
  }

  return <section className="history-surface" aria-labelledby="history-heading">
    <div className="history-top"><div className="history-title"><span className="history-icon"><History size={21} /></span><div><span className="detail-kicker">YOUR LOCAL RECORD</span><h2 id="history-heading">Inspection history</h2><p>Return to any decision and see exactly what the firewall saw.</p></div></div><div className="history-top-actions"><span className="history-count">{records.length} saved</span><Button type="button" variant="outline" size="sm" disabled={records.length === 0 || status !== "ready"} onClick={() => setDeleteTarget("all")}><Trash2 size={14} /> Clear history</Button></div></div>
    <div className="history-privacy"><LockKeyhole size={16} /><span>Saved on this browser only, including source text and results. Nothing is synced to an account. Your browser&apos;s site-data controls can also erase it.</span></div>
    {error && <p className="history-error" role="alert">{error}</p>}
    {status === "loading" ? <div className="history-empty"><Clock3 size={30} /><h3>Opening your history…</h3></div> : status === "unavailable" && records.length === 0 ? <div className="history-empty"><Clock3 size={30} /><h3>History is unavailable</h3><p>Inspections still work, but this browser could not open local storage.</p><Button onClick={onInspect}>Go to inspector <ArrowRight size={15} /></Button></div> : records.length === 0 ? <div className="history-empty"><span className="history-empty-icon"><History size={31} /></span><h3>No inspections yet</h3><p>Run your first inspection. Its decision and input will appear here automatically.</p><Button onClick={onInspect}>Start an inspection <ArrowRight size={15} /></Button></div> : <div className="history-grid">
      <div className="history-list-panel"><div className="history-controls"><div className="history-search"><Search size={16} /><Input aria-label="Search inspection history" placeholder="Search content or findings" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="history-filters" role="group" aria-label="Filter by decision">{filters.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div></div><div className="history-list" aria-label="Saved inspections">{visible.length ? visible.map(record => <div className={`history-row ${selected?.id === record.id ? "selected" : ""}`} key={record.id}><button type="button" className="history-row-main" onClick={() => setSelectedId(record.id)} aria-current={selected?.id === record.id ? "true" : undefined}><span className="history-row-top"><span className={`history-decision history-decision-${record.result.decision}`}>{record.result.decision}</span><time dateTime={record.inspectedAt}>{dateFor(record.inspectedAt)}</time></span><strong>{titleFor(record)}</strong><span className="history-row-meta">{sources.find(item => item.id === record.source)?.label ?? record.source} <span>·</span> {record.result.findings.length} signals <span>·</span> {record.content.length.toLocaleString()} chars</span></button><button type="button" className="history-row-delete" aria-label={`Delete inspection from ${dateFor(record.inspectedAt)}`} title="Delete inspection" onClick={() => setDeleteTarget(record.id)}><Trash2 size={15} /></button></div>) : <div className="history-no-match"><Search size={20} /><strong>No matches</strong><span>Try another search or decision filter.</span></div>}</div></div>
      <div className="history-preview-panel">{selected ? <><div className="history-preview-head"><span className="detail-kicker">SELECTED INSPECTION</span><time dateTime={selected.inspectedAt}>{dateFor(selected.inspectedAt)}</time></div><div className="history-preview-scroll"><div className="history-preview-intro"><span className={`history-decision history-decision-${selected.result.decision}`}><ShieldCheck size={13} /> {selected.result.decision}</span><span className="history-risk">Risk {selected.result.risk}/99</span></div><h3>{titleFor(selected)}</h3><p className="history-summary">{selected.result.summary}</p><div className="history-preview-metrics"><div><span>SOURCE</span><strong>{sources.find(item => item.id === selected.source)?.label ?? selected.source}</strong></div><div><span>SIGNALS</span><strong>{selected.result.findings.length}</strong></div><div><span>INPUT</span><strong>{selected.content.length.toLocaleString()} chars</strong></div></div><div className="history-preview-section"><span>TRUSTED QUESTION</span><p>{selected.question}</p></div><div className="history-preview-section"><span>ORIGINAL CONTENT</span><pre>{selected.content}</pre></div></div><div className="history-preview-action"><Button onClick={() => onOpen(selected)}>Open full inspection <ArrowRight size={16} /></Button></div></> : <div className="history-preview-placeholder"><Search size={24} /><p>Select an inspection to preview it.</p></div>}</div>
    </div>}
    <AlertDialog open={deleteTarget !== null} onOpenChange={open => { if (!open && !deleting) setDeleteTarget(null); }}><AlertDialogContent className="history-confirm"><AlertDialogHeader><AlertDialogTitle>{deleteTarget === "all" ? "Clear all inspection history?" : "Delete this inspection?"}</AlertDialogTitle><AlertDialogDescription>{deleteTarget === "all" ? `This will permanently remove all ${records.length} saved inspections from this browser. Your currently open inspection will stay on screen until you leave it.` : `This will permanently remove the ${targetRecord ? dateFor(targetRecord.inspectedAt) : "selected"} inspection from this browser.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Keep history</AlertDialogCancel><Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "Deleting…" : deleteTarget === "all" ? "Clear all" : "Delete inspection"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
