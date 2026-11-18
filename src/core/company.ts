// The Company Note (`.tinypeeps/company.md`): what every Peep reads before each Task (ADR 4). Past its
// limit Haiku shortens it once, and the CEO sees the change line by line and can undo it.

export const COMPANY_LIMIT_WORDS = 300;

export const overLimit = (text: string) => text.split(/\s+/).filter(Boolean).length > COMPANY_LIMIT_WORDS;

// Shortened once: a note already seen after a compaction (or an undo) isn't compacted again until it
// changes.
export const needsCompaction = (text: string, seen: string | null) => overLimit(text) && text.trim() !== seen?.trim();

export function compactionPrompt(note: string): string {
  return `Shorten this Company Note to under 200 words. Keep every goal, rule, name and fact a teammate needs; drop repetition and examples. Keep its language. Reply with only the new note, no preamble.

---
${note}`;
}

// The model's reply without a code fence it may have wrapped the note in.
export const cleanNote = (reply: string) =>
  reply
    .trim()
    .replace(/^```\w*\n([\s\S]*?)\n```$/, "$1")
    .trim();

export type DiffLine = { op: "same" | "del" | "add"; text: string };

// Line diff by longest common subsequence; Company Notes are short, so O(n·m) is fine.
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const L = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ op: "same", text: a[i++] });
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ op: "del", text: a[i++] });
    else out.push({ op: "add", text: b[j++] });
  }
  while (i < a.length) out.push({ op: "del", text: a[i++] });
  while (j < b.length) out.push({ op: "add", text: b[j++] });
  return out;
}
