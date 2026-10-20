export const AUTH_COOKIE = "ms_session";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PIN || "movieselector-dev-secret";
}

export async function hashPin(pin: string): Promise<string> {
  return hmacSha256(pin, `${getAuthSecret()}:pin`);
}

export async function createSessionToken(userId: number): Promise<string> {
  const sig = await hmacSha256(String(userId), `${getAuthSecret()}:session`);
  return `${userId}.${sig}`;
}

export async function parseSessionToken(
  token: string | undefined,
): Promise<{ userId: number } | null> {
  if (!token) return null;
  const [idPart, sig] = token.split(".");
  if (!idPart || !sig) return null;
  const userId = Number(idPart);
  if (!Number.isFinite(userId) || userId < 1) return null;
  const expected = await hmacSha256(String(userId), `${getAuthSecret()}:session`);
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return null;
  return { userId };
}

export async function isValidAuthToken(token: string | undefined): Promise<boolean> {
  return Boolean(await parseSessionToken(token));
}

export function generatePin(length = 4): string {
  let pin = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    pin += String(bytes[i] % 10);
  }
  return pin;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
