import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isAdminEmail, getIsAdmin } from "./auth";

describe("isAdminEmail", () => {
  const originalAdminEmail = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalAdminEmail;
  });

  it("returns true when the email matches ADMIN_EMAIL, case-insensitively", () => {
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("Admin@Example.com")).toBe(true);
  });

  it("returns false when the email does not match", () => {
    expect(isAdminEmail("someone-else@example.com")).toBe(false);
  });

  it("returns false when there is no email", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("returns false when ADMIN_EMAIL is not configured", () => {
    delete process.env.ADMIN_EMAIL;
    expect(isAdminEmail("admin@example.com")).toBe(false);
  });
});

describe("getIsAdmin", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  it("returns true when the current session belongs to the admin", async () => {
    const supabase = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: "admin@example.com" } } }) } };

    expect(await getIsAdmin(supabase)).toBe(true);
  });

  it("returns false when there is no signed-in user", async () => {
    const supabase = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } };

    expect(await getIsAdmin(supabase)).toBe(false);
  });
});
