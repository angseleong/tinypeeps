// An Approval: Claude Code asked to use a tool, and the CEO decides (ADR 5). Pure code.

export type Approval = { id: string; peepId: string; tool: string; input: Record<string, unknown>; at: number };
export type Answer = "allow" | "deny" | "always";

export type ApprovalKind = "command" | "edit" | "read" | "web" | "search" | "mcp" | "other";

const str = (v: unknown) => (typeof v === "string" ? v : "");

// What the request is about, in a shape the window can put in plain words.
export function approvalKind(tool: string, input: Record<string, unknown>): { kind: ApprovalKind; target: string } {
  if (tool === "Bash") return { kind: "command", target: str(input.command) };
  if (["Edit", "Write", "NotebookEdit", "MultiEdit"].includes(tool)) return { kind: "edit", target: str(input.file_path ?? input.notebook_path) };
  // Claude Code asks before reading only outside the Office folder, so the path is what matters.
  if (["Read", "Grep", "Glob"].includes(tool)) return { kind: "read", target: str(input.file_path ?? input.path ?? input.pattern) };
  if (tool === "WebFetch") return { kind: "web", target: str(input.url) };
  if (tool === "WebSearch") return { kind: "search", target: str(input.query) };
  if (tool.startsWith("mcp__")) {
    const [, server = "", name = ""] = tool.split("__");
    return { kind: "mcp", target: `${server}: ${name}` };
  }
  return { kind: "other", target: tool };
}

// The `--allowedTools` rule "always allow this for this Role" adds. A shell command is allowed only
// exactly as asked; any other tool as a whole, since its risk is the tool, not one argument.
export function allowRule(tool: string, input: Record<string, unknown>): string {
  const command = str(input.command).trim();
  return tool === "Bash" && command ? `Bash(${command})` : tool;
}
