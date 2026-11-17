import { en, type Strings } from "./en";
import { id } from "./id";

export type Lang = "en" | "id";
export const STRINGS: Record<Lang, Strings> = { en, id };
export type { Strings };

// A label from the Engine is either a key in `label` or literal text such as "Edit: logo.svg".
export function labelText(s: Strings, label: string): string {
  const v = s.label[label];
  return typeof v === "string" ? v : label;
}
