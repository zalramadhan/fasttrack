import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { createSession, deleteSession, findSessionUser } from "./db";

const COOKIE_NAME = "ft_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [method, salt, hash] = stored.split("$");
  if (method !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_MS;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: Math.floor(SESSION_MS / 1000),
  });
  // The hash is what the database keeps, so a leaked DB cannot be replayed.
  createSession(tokenHash(token), userId, expiresAt);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return findSessionUser(tokenHash(token));
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) deleteSession(tokenHash(token));
  store.delete(COOKIE_NAME);
}

export function adminEmails() {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
