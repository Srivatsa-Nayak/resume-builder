import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("API key encryption", () => {
  it("round-trips a secret", () => {
    const payload = encryptSecret("sk-test-1234567890", "user1:openai");
    expect(payload).not.toContain("sk-test");
    expect(decryptSecret(payload, "user1:openai")).toBe("sk-test-1234567890");
  });

  it("uses a fresh IV for every encryption", () => {
    expect(encryptSecret("same", "a")).not.toBe(encryptSecret("same", "a"));
  });

  it("refuses to decrypt for a different owner", () => {
    const payload = encryptSecret("sk-test", "user1:openai");
    expect(() => decryptSecret(payload, "user2:openai")).toThrow();
  });

  it("detects tampering", () => {
    const [iv, tag, data] = encryptSecret("sk-test", "u:p").split(".");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    expect(() => decryptSecret([iv, tag, flipped.toString("base64")].join("."), "u:p")).toThrow();
  });
});
