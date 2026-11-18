// A Role can rename an Activity for its job (docs/office.md#activities); the rest keep their usual names.
import { describe, expect, it } from "vitest";
import { activityLabel } from "../src/app/activity-ui";
import { parseRole, serializeRole } from "../src/core/roles";
import { STRINGS } from "../src/core/strings";

describe("Role activity labels", () => {
  it("shows the Role's name for an Activity, and the usual one otherwise", () => {
    const editor = parseRole("vid", "---\nname: Vid\nlabels:\n  typing: Editing video\n  reading: 12\n---\nBrief.\n");
    expect(editor.labels).toEqual({ typing: "Editing video" });
    expect(activityLabel(STRINGS.en, { ...editor, activity: "typing" })).toBe("Editing video");
    expect(activityLabel(STRINGS.en, { ...editor, activity: "reading" })).toBe(STRINGS.en.activity.reading);
    expect(parseRole("vid", serializeRole(editor)).labels).toEqual({ typing: "Editing video" });
    expect(parseRole("plain", "---\nname: Plain\n---\nBrief.\n").labels).toBeUndefined();
  });
});
