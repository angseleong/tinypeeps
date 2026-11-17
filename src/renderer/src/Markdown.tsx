// biome-ignore-all lint/suspicious/noArrayIndexKey: parsed text is drawn once per reply and never reordered, so position is identity
// Renders what src/core/markdown reads as React elements: no HTML from a model's reply ever reaches the
// window. Links show their address on hover; they don't open, since the window can't leave the app.
import { Fragment } from "react";
import { type Block, type Inline, markdown } from "../../core/markdown";
import { cx } from "./ui";

function Inlines({ c }: { c: Inline[] }) {
  return (
    <>
      {c.map((x, i) => {
        const k = i;
        if (x.t === "text")
          return (
            <Fragment key={k}>
              {x.v.split("\n").map((part, j) => (
                <Fragment key={`${k}-${j}`}>
                  {j > 0 && <br />}
                  {part}
                </Fragment>
              ))}
            </Fragment>
          );
        if (x.t === "b")
          return (
            <strong key={k} className="font-semibold text-ink">
              <Inlines c={x.c} />
            </strong>
          );
        if (x.t === "i")
          return (
            <em key={k}>
              <Inlines c={x.c} />
            </em>
          );
        if (x.t === "code")
          return (
            <code key={k} className="rounded-[6px] bg-fill-2 px-1.5 py-0.5 font-mono text-[0.88em]">
              {x.v}
            </code>
          );
        return (
          <span key={k} title={x.href} className="underline decoration-fill-3 underline-offset-2">
            <Inlines c={x.c} />
          </span>
        );
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        const k = i;
        switch (b.t) {
          case "p":
            return (
              <p key={k}>
                <Inlines c={b.c} />
              </p>
            );
          case "h":
            return (
              <h4 key={k} className={cx("font-semibold tracking-[-0.01em] text-ink", b.level <= 2 ? "text-[15.5px]" : "text-[14.5px]")}>
                <Inlines c={b.c} />
              </h4>
            );
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag
                key={k}
                start={b.ordered ? b.start : undefined}
                className={cx("flex flex-col gap-1 pl-5", b.ordered ? "list-decimal" : "list-disc", "marker:text-muted")}
              >
                {b.items.map((it, j) => (
                  <li key={`${k}-${j}`} style={{ marginLeft: it.level * 16 }} className="pl-1">
                    <Inlines c={it.c} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "code":
            return (
              <pre key={k} className="overflow-x-auto rounded-tile bg-fill-1 px-3.5 py-3 font-mono text-[12.5px] leading-relaxed">
                <code>{b.v}</code>
              </pre>
            );
          case "quote":
            return (
              <div key={k} className="relative pl-4 text-ink-2">
                <span className="absolute top-0.5 bottom-0.5 left-0 w-[3px] rounded-full bg-fill-3" aria-hidden />
                <Blocks blocks={b.c} />
              </div>
            );
          case "table":
            return (
              <div key={k} className="overflow-x-auto rounded-tile bg-fill-1">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={`${k}-h${j}`} className="px-3 py-2 text-[12px] font-medium whitespace-nowrap text-muted">
                          <Inlines c={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={`${k}-r${j}`} className="odd:bg-fill-1">
                        {r.map((cell, n) => (
                          <td key={`${k}-r${j}-${n}`} className="px-3 py-2 align-top">
                            <Inlines c={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return <hr key={k} className="my-1 h-px border-0 bg-fill-2" />;
        }
      })}
    </>
  );
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-3 text-[14px] leading-[1.6] text-ink-2", className)}>
      <Blocks blocks={markdown(text)} />
    </div>
  );
}
