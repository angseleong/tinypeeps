import { describe, expect, it } from "vitest";
import { inline, markdown } from "./markdown";

describe("markdown", () => {
  it("reads bold, italic, code and links inside a line", () => {
    expect(inline("a **big** *small* `x` [doc](https://a.b)")).toEqual([
      { t: "text", v: "a " },
      { t: "b", c: [{ t: "text", v: "big" }] },
      { t: "text", v: " " },
      { t: "i", c: [{ t: "text", v: "small" }] },
      { t: "text", v: " " },
      { t: "code", v: "x" },
      { t: "text", v: " " },
      { t: "link", c: [{ t: "text", v: "doc" }], href: "https://a.b" },
    ]);
  });

  it("keeps snake_case and lone stars as text", () => {
    expect(inline("file_name.md costs 2 * 3")).toEqual([{ t: "text", v: "file_name.md costs 2 * 3" }]);
  });

  it("reads the shapes the Manager writes: a question, a list, a table", () => {
    const text = [
      "**Q1: Main goal.** What should the site do?",
      "- (a) Orders through **WhatsApp**",
      "- (b) Visit the shop",
      "  with a map",
      "",
      "| Role | Model |",
      "|---|---|",
      "| Copywriter | haiku |",
      "",
      "1. Number",
      "2. Hours",
    ].join("\n");
    const b = markdown(text);
    expect(b.map((x) => x.t)).toEqual(["p", "list", "table", "list"]);
    const list = b[1] as Extract<(typeof b)[number], { t: "list" }>;
    expect(list.items).toHaveLength(2);
    expect(list.items[1].c).toEqual([{ t: "text", v: "(b) Visit the shop with a map" }]);
    const table = b[2] as Extract<(typeof b)[number], { t: "table" }>;
    expect(table.rows[0][1]).toEqual([{ t: "text", v: "haiku" }]);
    expect((b[3] as Extract<(typeof b)[number], { t: "list" }>).ordered).toBe(true);
  });

  it("reads headings, code fences, quotes and rules", () => {
    const b = markdown("## Plan\n```ts\nconst a = 1;\n```\n> note\n\n---\nend");
    expect(b.map((x) => x.t)).toEqual(["h", "code", "quote", "hr", "p"]);
    expect(b[1]).toEqual({ t: "code", lang: "ts", v: "const a = 1;" });
  });
});
