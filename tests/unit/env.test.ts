import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/subiq",
};

describe("parseEnv", () => {
  it("accepts a valid environment", () => {
    const env = parseEnv(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.NODE_ENV).toBe("test");
  });

  it("accepts postgres:// as well as postgresql://", () => {
    expect(() =>
      parseEnv({ ...valid, DATABASE_URL: "postgres://u:p@host:5432/db" }),
    ).not.toThrow();
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseEnv({ NODE_ENV: "test" })).toThrow(
      /Invalid environment variables/,
    );
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() =>
      parseEnv({ ...valid, DATABASE_URL: "mysql://u:p@host:3306/db" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects an AUTH_SECRET that is too short", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(
      /AUTH_SECRET/,
    );
  });

  it("defaults NODE_ENV to development", () => {
    const env = parseEnv({ DATABASE_URL: valid.DATABASE_URL });
    expect(env.NODE_ENV).toBe("development");
  });

  it("treats empty strings as unset", () => {
    const env = parseEnv({ ...valid, AUTH_SECRET: "" });
    expect(env.AUTH_SECRET).toBeUndefined();
  });

  it("requires AUTH_SECRET in production", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).toThrow(
      /AUTH_SECRET/,
    );
  });

  it("requires CRON_SECRET in production", () => {
    expect(() =>
      parseEnv({
        ...valid,
        NODE_ENV: "production",
        AUTH_SECRET: "a".repeat(32),
      }),
    ).toThrow(/CRON_SECRET/);
  });

  it("rejects a CRON_SECRET that is too short", () => {
    expect(() => parseEnv({ ...valid, CRON_SECRET: "short" })).toThrow(
      /CRON_SECRET/,
    );
  });

  it("rejects half-configured OAuth pairs", () => {
    expect(() => parseEnv({ ...valid, AUTH_GOOGLE_ID: "id-only" })).toThrow(
      /AUTH_GOOGLE_SECRET/,
    );
  });

  it("accepts fully configured OAuth pairs", () => {
    expect(() =>
      parseEnv({
        ...valid,
        AUTH_GITHUB_ID: "id",
        AUTH_GITHUB_SECRET: "secret",
      }),
    ).not.toThrow();
  });
});
