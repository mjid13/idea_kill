import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/lib/projects/errors";
import {
  decodeProjectData,
  encodeProjectData,
  isEncryptedProjectData,
  projectEncryptionConfig,
} from "../projectEncryption";

const projectId = "11111111-1111-4111-8111-111111111111";
const key = Buffer.alloc(32, 7).toString("base64");
const original = { ...process.env };

beforeEach(() => {
  process.env.PROJECT_ENCRYPTION_MODE = "required";
  process.env.PROJECT_ENCRYPTION_KEYS = JSON.stringify({ "test-v1": key });
  process.env.PROJECT_ENCRYPTION_ACTIVE_KEY_ID = "test-v1";
});

afterEach(() => {
  process.env = { ...original };
});

describe("project encryption", () => {
  it("round-trips Unicode project data without deterministic ciphertext", () => {
    const value = { name: "مشروع تجريبي", notes: "line one\nline two", values: [1, true, null] };
    const first = encodeProjectData(projectId, value);
    const second = encodeProjectData(projectId, value);
    expect(isEncryptedProjectData(first)).toBe(true);
    expect(first).not.toEqual(second);
    expect(decodeProjectData(projectId, first)).toEqual(value);
  });

  it("binds ciphertext to its project id", () => {
    const encrypted = encodeProjectData(projectId, { secret: "value" });
    expect(() => decodeProjectData("22222222-2222-4222-8222-222222222222", encrypted))
      .toThrow("Project data is temporarily unavailable.");
  });

  it("rejects tampering without exposing crypto details", () => {
    const encrypted = encodeProjectData(projectId, { secret: "value" }) as Record<string, unknown>;
    const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext}A` };
    expect(() => decodeProjectData(projectId, tampered)).toThrow(DomainError);
    try {
      decodeProjectData(projectId, tampered);
    } catch (error) {
      expect((error as Error).message).toBe("Project data is temporarily unavailable.");
    }
  });

  it("supports plaintext in transition modes and rejects writes in read-only mode", () => {
    const value = { legacy: true };
    process.env.PROJECT_ENCRYPTION_MODE = "prepare";
    expect(encodeProjectData(projectId, value)).toBe(value);
    expect(decodeProjectData(projectId, value)).toBe(value);
    process.env.PROJECT_ENCRYPTION_MODE = "read-only";
    expect(() => encodeProjectData(projectId, value)).toThrow("Project changes are temporarily unavailable.");
  });

  it("fails closed for missing, invalid, and unknown keys", () => {
    delete process.env.PROJECT_ENCRYPTION_ACTIVE_KEY_ID;
    expect(() => projectEncryptionConfig()).toThrow("Project data is temporarily unavailable.");

    process.env.PROJECT_ENCRYPTION_ACTIVE_KEY_ID = "test-v1";
    process.env.PROJECT_ENCRYPTION_KEYS = JSON.stringify({ "test-v1": "too-short" });
    expect(() => projectEncryptionConfig()).toThrow("Project data is temporarily unavailable.");

    process.env.PROJECT_ENCRYPTION_KEYS = JSON.stringify({ other: key });
    expect(() => projectEncryptionConfig()).toThrow("Project data is temporarily unavailable.");
  });

  it("requires an explicit mode in production", () => {
    delete process.env.PROJECT_ENCRYPTION_MODE;
    expect(() => projectEncryptionConfig({ ...process.env, NODE_ENV: "production" }))
      .toThrow("Project data is temporarily unavailable.");
    expect(() => projectEncryptionConfig({ ...process.env, NODE_ENV: "production", PROJECT_ENCRYPTION_MODE: "off" }))
      .toThrow("Project data is temporarily unavailable.");
  });
});
