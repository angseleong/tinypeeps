// Keeps the Company Note under its limit: Haiku shortens it once, the old text is kept next to it,
// and the window shows the change so the CEO can keep or undo it (ADR 4).
import { cleanNote, compactionPrompt, needsCompaction } from "../core/company";
import { askOnce } from "./engine";
import { appendUsage, readCompany, writeCompany } from "./store";

export type Compacted = { office: string; before: string; after: string };

const BEFORE = "company.before.md";
const SEEN = "run/company-seen.md";
const busy = new Set<string>();

export async function maybeCompact(office: string, claude: string, onCompacted: (c: Compacted) => void, onUsage: () => void) {
  const before = readCompany(office);
  if (!before || busy.has(office) || !needsCompaction(before, readCompany(office, SEEN))) return;
  busy.add(office);
  try {
    const r = await askOnce(claude, office, "haiku", compactionPrompt(before));
    appendUsage(office, { ts: Date.now(), peepId: "company", models: r.models });
    onUsage();
    const after = cleanNote(r.text);
    // The CEO may have edited it meanwhile; their version wins.
    if (!after || readCompany(office) !== before) return;
    writeCompany(office, BEFORE, before);
    writeCompany(office, "company.md", `${after}\n`);
    writeCompany(office, SEEN, `${after}\n`);
    onCompacted({ office, before, after });
  } catch {
    // Left as it is; the next Task tries again.
  } finally {
    busy.delete(office);
  }
}

export function undoCompaction(office: string) {
  const before = readCompany(office, BEFORE);
  if (!before) return;
  writeCompany(office, "company.md", before);
  writeCompany(office, SEEN, before);
}
