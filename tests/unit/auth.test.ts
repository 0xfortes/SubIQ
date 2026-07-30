import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/features/auth/schemas";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies a correct password round-trip", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(
      true,
    );
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("s3cret-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("uses a unique salt per hash", async () => {
    expect(await hashPassword("same-input")).not.toBe(
      await hashPassword("same-input"),
    );
  });

  it("encodes the cost parameters in the hash string", async () => {
    const hash = await hashPassword("whatever");
    // scrypt:<N>:<r>:<p>:<salt>:<hash>
    expect(hash.split(":")).toHaveLength(6);
    expect(hash.startsWith("scrypt:")).toBe(true);
  });

  it("returns false for a malformed stored value instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt:zz:zz")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Ada",
    email: "ADA@Example.com",
    password: "password123",
    confirmPassword: "password123",
  };

  it("accepts a valid registration and lowercases the email", () => {
    const parsed = registerSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("ada@example.com");
      expect(parsed.data.name).toBe("Ada");
    }
  });

  it("normalizes an empty/whitespace name to null", () => {
    const parsed = registerSchema.safeParse({ ...base, name: "   " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBeNull();
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      registerSchema.safeParse({
        ...base,
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects a mismatched confirmation on the confirmPassword field", () => {
    const parsed = registerSchema.safeParse({
      ...base,
      confirmPassword: "different1",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...base, email: "nope" }).success).toBe(
      false,
    );
  });
});

describe("loginSchema", () => {
  it("accepts email + password and lowercases the email", () => {
    const parsed = loginSchema.safeParse({
      email: "USER@X.io",
      password: "whatever",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("user@x.io");
  });

  it("requires a non-empty password", () => {
    expect(
      loginSchema.safeParse({ email: "user@x.io", password: "" }).success,
    ).toBe(false);
  });
});
