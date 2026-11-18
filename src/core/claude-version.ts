// Claude Code versions TinyPeeps was checked against: its flags, `stream-json` and permission prompts
// (ADR 1). Add a version here only after the app's checks pass with it.
export const TESTED_CLAUDE = ["2.1.292"];

export const untested = (version: string | undefined, warned: string | null) => !!version && !TESTED_CLAUDE.includes(version) && version !== warned;
