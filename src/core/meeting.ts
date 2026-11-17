// A Meeting in the Meeting Room: the Kickoff or one the CEO called. Saved per Office in
// `.tinypeeps/meeting.json` so the chat survives a restart (a new session is sent what was said).
export type ChatLine = { from: "ceo" | "manager"; text: string; t: number };
export type Meeting = { chat: ChatLine[]; attendees: string[]; kickoff: boolean };
