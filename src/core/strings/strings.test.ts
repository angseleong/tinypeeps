import { describe, expect, it } from "vitest";
import { STRINGS } from ".";

const shape = (o: unknown): unknown =>
  o && typeof o === "object" && !Array.isArray(o)
    ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)]))
    : Array.isArray(o)
      ? o.length
      : typeof o;

describe("strings", () => {
  it("has every English word in Indonesian too", () => {
    expect(shape(STRINGS.id)).toEqual(shape(STRINGS.en));
  });
});
