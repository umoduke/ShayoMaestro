import crypto from "node:crypto";
import { db, adminEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const SUPER_ADMIN_EMAIL = "admin@asl.com";

// Admin session tokens are valid for 7 days, after which the admin must log in
// again. Tokens are HMAC-signed with SESSION_SECRET (no third-party JWT
// dependency needed) and are stateless — the signature + expiry are the proof.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

interface TokenPayload {
  email: string;
  exp: number;
  // Present on customer (user-account) tokens; absent on the super-admin token.
  sub?: string;
}

// Constant-time string comparison (hashes both sides to a fixed length first so
// timingSafeEqual never throws on length mismatch and length isn't leaked).
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function createAdminToken(email: string): string {
  return signToken({
    email: email.toLowerCase().trim(),
    exp: Date.now() + TOKEN_TTL_MS,
  });
}

// Customer session token — carries the user id (`sub`) so authed customer
// endpoints (e.g. /auth/me) can resolve the account. Signed identically to the
// admin token; admin-only routes still gate on isAdminEmail, so an ordinary
// user token can never pass requireAdmin.
export function createUserToken(userId: string, email: string): string {
  return signToken({
    sub: userId,
    email: email.toLowerCase().trim(),
    exp: Date.now() + TOKEN_TTL_MS,
  });
}

export function verifyAdminToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body!)
    .digest("base64url");
  if (!safeEqual(sig!, expected)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body!, "base64url").toString(),
    ) as TokenPayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    if (typeof payload.email !== "string" || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

// The super-admin (store owner) is the only account with a server-verified
// password, supplied via the ADMIN_PASSWORD secret. Returns false if the secret
// isn't configured so a missing secret can never accidentally grant access.
export function verifySuperAdminPassword(
  email: string,
  password: string,
): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const emailMatches = email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
  // Evaluate both comparisons regardless so timing doesn't reveal which failed.
  const passwordMatches = safeEqual(password, expected);
  return emailMatches && passwordMatches;
}

// Verify a bearer token and return its payload (or null). Alias kept distinct
// from verifyAdminToken so call sites read clearly; the scheme is identical.
export const verifySessionToken = verifyAdminToken;

// Extract + verify the bearer token from a request's Authorization header.
export function getTokenPayload(
  authorization: string | undefined,
): TokenPayload | null {
  const header = authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  return verifyAdminToken(token);
}

// Hash a password with scrypt (dependency-free). Stored as `salt:hash` hex.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// A fixed dummy hash used to keep login timing uniform when no account exists,
// so attackers can't distinguish "no such email" from "wrong password".
// Computed once at module load rather than per failed request.
export const DUMMY_PASSWORD_HASH = hashPassword("__nonexistent_account__");

// Constant-time verify of a password against a stored `salt:hash` string.
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// True if the email is the permanent super-admin or is in the admin allowlist.
export async function isAdminEmail(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (normalized === SUPER_ADMIN_EMAIL) return true;
  const [row] = await db
    .select()
    .from(adminEmailsTable)
    .where(eq(adminEmailsTable.email, normalized))
    .limit(1);
  return Boolean(row);
}
