import { describe, expect, it } from "vitest";
import { GALLERY_TEMPLATES, TEMPLATE_LIST, searchTemplates } from "./templates";

describe("GALLERY_TEMPLATES", () => {
  it("lists every template exactly once", () => {
    expect(GALLERY_TEMPLATES.map((t) => t.id).sort()).toEqual(TEMPLATE_LIST.map((t) => t.id).sort());
  });
});

const names = (query: string) => searchTemplates(TEMPLATE_LIST, query).map((t) => t.name);

describe("searchTemplates", () => {
  it("returns everything for an empty query", () => {
    expect(names("  ")).toHaveLength(TEMPLATE_LIST.length);
  });

  it("finds templates by name, category and font", () => {
    expect(names("aurora")).toEqual(["Aurora"]);
    expect(names("minimalist")).toEqual(["Minimal", "Nordic", "Clarity"]);
    expect(names("poppins")).toEqual(expect.arrayContaining(["Aurora", "Pulse", "Studio"]));
  });

  it("finds design features and supports partial words", () => {
    expect(names("timeline")).toEqual(expect.arrayContaining(["Aurora", "Bold", "Metro", "Blueprint", "Sage"]));
    expect(names("side")).toEqual(expect.arrayContaining(["Creative", "Slate", "Aurora"]));
    expect(names("sidebar")).not.toContain("Harbor");
    expect(names("header band")).toEqual(expect.arrayContaining(["Harbor", "Bold", "Pulse", "Horizon"]));
  });

  it("separates serif from sans-serif designs", () => {
    const serif = names("serif");
    expect(serif).toEqual(expect.arrayContaining(["Elegant", "Garamond", "Traditional"]));
    expect(serif).not.toContain("Modern");
    expect(serif).not.toContain("Aurora");
  });

  it("requires every word to match", () => {
    expect(names("creative timeline")).toEqual(["Sage"]);
    expect(names("zzzz")).toEqual([]);
  });
});
