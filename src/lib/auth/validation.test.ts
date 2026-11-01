import { describe, expect, it } from "vitest";
import { SignupSchema, safeNextPath } from "./validation";

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/resumes/abc?x=1")).toBe("/resumes/abc?x=1");
  });

  it("blocks open redirects", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", undefined, 42]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });
});

describe("SignupSchema", () => {
  it("normalizes email and enforces password length", () => {
    expect(SignupSchema.parse({ name: " Sam ", email: " Sam@Example.COM ", password: "longenough" })).toEqual({
      name: "Sam",
      email: "sam@example.com",
      password: "longenough",
    });
    expect(SignupSchema.safeParse({ name: "Sam", email: "sam@example.com", password: "short" }).success).toBe(false);
    expect(SignupSchema.safeParse({ name: "Sam", email: "not-an-email", password: "longenough" }).success).toBe(false);
  });
});
