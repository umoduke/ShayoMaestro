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
}

// Constant-time string comparison (hashes both sides to a fixed length first so
// timingSafeEqual never throws on length mismatch and length isn't leaked).
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function createAdminToken(email: string): string {
  const payload: TokenPayload = {
    email: email.toLowerCase().trim(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
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
