// A small Markdown reader for what Claude writes in chat: headings, lists, tables, code, quotes, rules,
// **bold**, *italic*, `code` and links. It returns data, never HTML, so the window renders it as React
// elements and nothing in a model's reply can run in the window. Pure code.

export type Inline =
  | { t: "text"; v: string }
  | { t: "b"; c: Inline[] }
  | { t: "i"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; c: Inline[]; href: string };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: number; c: Inline[] }
  | { t: "list"; ordered: boolean; start: number; items: { level: number; c: Inline[] }[] }
  | { t: "code"; lang: string; v: string }
  | { t: "quote"; c: Block[] }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] }
  | { t: "hr" };

const ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const isTableRow = (l: string) => l.trim().startsWith("|");
const startsBlock = (l: string) => HEADING.test(l) || ITEM.test(l) || l.trim().startsWith("```") || l.trim().startsWith(">") || RULE.test(l);

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => inline(c.trim()));

export function markdown(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = /^\s*```\s*(\S*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) body.push(lines[i]);
      i++; // the closing fence, if any
      out.push({ t: "code", lang: fence[1], v: body.join("\n") });
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      out.push({ t: "h", level: h[1].length, c: inline(h[2]) });
      i++;
      continue;
    }
    if (RULE.test(line)) {
      out.push({ t: "hr" });
      i++;
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const head = cells(line);
      const rows: Inline[][][] = [];
      for (i += 2; i < lines.length && isTableRow(lines[i]); i++) rows.push(cells(lines[i]));
      out.push({ t: "table", head, rows });
      continue;
    }
    if (line.trim().startsWith(">")) {
      const body: string[] = [];
      for (; i < lines.length && lines[i].trim().startsWith(">"); i++) body.push(lines[i].trim().replace(/^>\s?/, ""));
      out.push({ t: "quote", c: markdown(body.join("\n")) });
      continue;
    }
    const first = ITEM.exec(line);
    if (first) {
      const ordered = /\d/.test(first[2]);
      const items: { level: number; c: string }[] = [];
      while (i < lines.length) {
        const m = ITEM.exec(lines[i]);
        if (m && /\d/.test(m[2]) === ordered) {
          items.push({ level: Math.min(3, Math.floor(m[1].replace(/\t/g, "  ").length / 2)), c: m[3] });
        } else if (m || !lines[i].trim() || !/^\s/.test(lines[i])) {
          if (m && items.length)
            items.push({ level: Math.min(3, Math.floor(m[1].length / 2)), c: m[3] }); // a nested list of the other kind
          else break;
        } else {
          items[items.length - 1].c += ` ${lines[i].trim()}`; // a wrapped item
        }
        i++;
      }
      out.push({ t: "list", ordered, start: ordered ? Number.parseInt(first[2], 10) : 1, items: items.map((x) => ({ level: x.level, c: inline(x.c) })) });
      continue;
    }
    const para: string[] = [];
    for (
      ;
      i < lines.length && lines[i].trim() && (para.length === 0 || !startsBlock(lines[i])) && !(isTableRow(lines[i]) && TABLE_SEP.test(lines[i + 1] ?? ""));
      i++
    )
      para.push(lines[i].trim());
    out.push({ t: "p", c: inline(para.join("\n")) });
  }
  return out;
}

// Earliest match wins; bold before italic so `**` isn't read as two italics.
const INLINE: [RegExp, (m: RegExpExecArray) => Inline][] = [
  [/`([^`\n]+)`/, (m) => ({ t: "code", v: m[1] })],
  [/\[([^\]\n]+)\]\(([^)\s]+)\)/, (m) => ({ t: "link", c: inline(m[1]), href: m[2] })],
  [/\*\*(?=\S)([\s\S]*?\S)\*\*/, (m) => ({ t: "b", c: inline(m[1]) })],
  [/__(?=\S)([\s\S]*?\S)__/, (m) => ({ t: "b", c: inline(m[1]) })],
  [/\*(?=[^\s*])([^*\n]*?[^\s*])\*/, (m) => ({ t: "i", c: inline(m[1]) })],
  [/(?<![\w])_(?=\S)([^_\n]*?\S)_(?![\w])/, (m) => ({ t: "i", c: inline(m[1]) })],
];

export function inline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  while (rest) {
    let best: { m: RegExpExecArray; make: (m: RegExpExecArray) => Inline } | null = null;
    for (const [re, make] of INLINE) {
      const m = re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { m, make };
    }
    if (!best) {
      out.push({ t: "text", v: rest });
      break;
    }
    if (best.m.index) out.push({ t: "text", v: rest.slice(0, best.m.index) });
    out.push(best.make(best.m));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}
