import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { PublicUser, UserPlan, UserRole } from "@/lib/types";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  whatsapp: string;
  role: UserRole;
  plan: UserPlan;
  status: "active" | "suspended";
  created_at: number;
  activated_at: number | null;
  email_verified_at: number | null;
};

type SessionRow = UserRow & { expires_at: number };

type OrderRow = {
  id: string;
  code: string;
  user_id: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  note: string;
  created_at: number;
  confirmed_at: number | null;
  confirmed_by: string | null;
};

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(
  process.env.DATABASE_PATH || path.join(dataDir, "app.db"),
);

const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    activated_at INTEGER,
    activated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    confirmed_at INTEGER,
    confirmed_by TEXT
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_audit (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS rate_limits_reset ON rate_limits(reset_at);
  CREATE INDEX IF NOT EXISTS email_tokens_user ON email_tokens(user_id);
  CREATE INDEX IF NOT EXISTS orders_status ON orders(status, created_at);
  CREATE INDEX IF NOT EXISTS admin_audit_created ON admin_audit(created_at);
`;

function wait(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Several build workers can open the database at once. Keep each statement
// waiting briefly, then retry the whole transaction instead of failing the build.
for (let attempt = 0; ; attempt += 1) {
  try {
    db.exec("PRAGMA busy_timeout = 15000; PRAGMA journal_mode = WAL;");
    db.exec(schema);
    // Additive migrations for databases created by earlier builds.
    const userColumns = new Set(
      (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map(
        (column) => column.name,
      ),
    );
    if (!userColumns.has("email_verified_at")) {
      db.exec("ALTER TABLE users ADD COLUMN email_verified_at INTEGER");
      // Accounts created before email verification existed are trusted.
      db.exec("UPDATE users SET email_verified_at = created_at");
    }
    break;
  } catch (error) {
    const locked =
      error instanceof Error && /database is locked|SQLITE_BUSY/i.test(error.message);
    if (!locked || attempt >= 4) throw error;
    wait(250 * (attempt + 1));
  }
}

function publicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    whatsapp: row.whatsapp,
    role: row.role,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    emailVerifiedAt: row.email_verified_at ?? null,
  };
}

export function findUserByEmail(email: string) {
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
  return row ? { row, user: publicUser(row) } : null;
}

export function findUserById(id: string) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
  return row ? { row, user: publicUser(row) } : null;
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  whatsapp: string;
  role: UserRole;
}) {
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO users
      (id, email, password_hash, name, whatsapp, role, plan, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'free', 'active', ?)`,
  ).run(
    id,
    input.email,
    input.passwordHash,
    input.name,
    input.whatsapp,
    input.role,
    now,
  );
  return findUserById(id)!.user;
}

export function markEmailVerified(userId: string) {
  db.prepare("UPDATE users SET email_verified_at = ? WHERE id = ?").run(
    Date.now(),
    userId,
  );
  return findUserById(userId)?.user ?? null;
}

export function createEmailToken(tokenHash: string, userId: string, expiresAt: number) {
  db.prepare("DELETE FROM email_tokens WHERE user_id = ?").run(userId);
  db.prepare(
    "INSERT INTO email_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(tokenHash, userId, expiresAt, Date.now());
}

export function consumeEmailToken(tokenHash: string) {
  const row = db
    .prepare("SELECT user_id, expires_at FROM email_tokens WHERE token_hash = ?")
    .get(tokenHash) as { user_id: string; expires_at: number } | undefined;
  if (!row) return null;
  db.prepare("DELETE FROM email_tokens WHERE token_hash = ?").run(tokenHash);
  if (row.expires_at <= Date.now()) return null;
  return row.user_id;
}

export function createSession(tokenHash: string, userId: string, expiresAt: number) {
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(tokenHash, userId, expiresAt, Date.now());
}

export function findSessionUser(tokenHash: string) {
  const row = db
    .prepare(
      `SELECT u.*, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as SessionRow | undefined;
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    deleteSession(tokenHash);
    return null;
  }
  if (row.status !== "active") return null;
  return publicUser(row);
}

export function deleteSession(tokenHash: string) {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function getPendingOrder(userId: string) {
  return db
    .prepare(
      "SELECT * FROM orders WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId) as OrderRow | undefined;
}

export function listOrdersByUser(userId: string) {
  return db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100")
    .all(userId) as OrderRow[];
}

export function createOrder(userId: string, amount: number, code: string) {
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO orders (id, code, user_id, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
  ).run(id, code, userId, amount, now);
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow;
}

export function orderCodeExists(code: string) {
  return Boolean(
    db.prepare("SELECT 1 FROM orders WHERE code = ?").get(code),
  );
}

export function listUsersWithPendingOrder() {
  return db
    .prepare(
      `SELECT u.*, o.code AS pending_code, o.created_at AS pending_created_at
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'pending'
       ORDER BY u.created_at DESC`,
    )
    .all() as (UserRow & {
    pending_code: string | null;
    pending_created_at: number | null;
  })[];
}

export function activateLifetime(userId: string, adminId: string, note = "") {
  const now = Date.now();
  db.prepare(
    `UPDATE users
     SET plan = 'lifetime', activated_at = ?, activated_by = ?
     WHERE id = ?`,
  ).run(now, adminId, userId);
  db.prepare(
    `UPDATE orders
     SET status = 'paid', note = ?, confirmed_at = ?, confirmed_by = ?
     WHERE user_id = ? AND status = 'pending'`,
  ).run(note, now, adminId, userId);
  return findUserById(userId)?.user ?? null;
}

export function getUserForAdmin(id: string) {
  return findUserById(id)?.user ?? null;
}

type RateLimitRow = { count: number; reset_at: number };

export function rateLimitRetryAfter(key: string, limit: number) {
  const now = Date.now();
  const row = db
    .prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?")
    .get(key) as RateLimitRow | undefined;
  if (!row || row.reset_at <= now || row.count < limit) return 0;
  return Math.max(1, Math.ceil((row.reset_at - now) / 1000));
}

export function recordRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const resetAt = now + windowMs;
  const row = db
    .prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?")
    .get(key) as RateLimitRow | undefined;

  if (!row || row.reset_at <= now) {
    db.prepare(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
    ).run(key, resetAt);
    return 0;
  }

  const count = row.count + 1;
  db.prepare("UPDATE rate_limits SET count = ? WHERE key = ?").run(count, key);
  if (count <= limit) return 0;
  return Math.max(1, Math.ceil((row.reset_at - now) / 1000));
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const blocked = rateLimitRetryAfter(key, limit);
  if (blocked) return blocked;
  return recordRateLimit(key, limit, windowMs);
}

export function clearRateLimit(key: string) {
  db.prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
}

export type ProjectRow = {
  user_id: string;
  data: string;
  created_at: number;
  updated_at: number;
};

export function getProject(userId: string) {
  return db
    .prepare("SELECT * FROM projects WHERE user_id = ?")
    .get(userId) as ProjectRow | undefined;
}

export function saveProject(userId: string, data: string) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO projects (user_id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(userId, data, now, now);
  return now;
}

export function getSetting(key: string) {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string, adminId: string) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO settings (key, value, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  ).run(key, value, now, adminId);
}

export function logAdminAction(input: {
  adminId: string;
  action: string;
  targetId?: string;
  detail?: string;
}) {
  db.prepare(
    "INSERT INTO admin_audit (id, admin_id, action, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    randomUUID(),
    input.adminId,
    input.action,
    input.targetId ?? "",
    input.detail ?? "",
    Date.now(),
  );
}

export function setUserStatus(
  userId: string,
  status: "active" | "suspended",
) {
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  return findUserById(userId)?.user ?? null;
}

export function cancelOrder(orderId: string, adminId: string, note = "") {
  const result = db
    .prepare(
      `UPDATE orders
       SET status = 'cancelled', note = ?, confirmed_at = ?, confirmed_by = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .run(note, Date.now(), adminId, orderId);
  return result.changes > 0;
}

export function getAdminStats() {
  const users = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN plan = 'lifetime' THEN 1 ELSE 0 END) AS lifetime,
         SUM(CASE WHEN plan = 'free' THEN 1 ELSE 0 END) AS free,
         SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended,
         SUM(CASE WHEN email_verified_at IS NULL THEN 1 ELSE 0 END) AS unverified
       FROM users`,
    )
    .get() as {
    total: number;
    lifetime: number | null;
    free: number | null;
    suspended: number | null;
    unverified: number | null;
  };
  const orders = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS revenue
       FROM orders`,
    )
    .get() as {
    pending: number | null;
    paid: number | null;
    cancelled: number | null;
    revenue: number | null;
  };
  const projects = db
    .prepare("SELECT COUNT(*) AS total FROM projects")
    .get() as { total: number };
  return {
    users: users.total,
    lifetime: users.lifetime ?? 0,
    free: users.free ?? 0,
    suspended: users.suspended ?? 0,
    unverified: users.unverified ?? 0,
    pendingOrders: orders.pending ?? 0,
    paidOrders: orders.paid ?? 0,
    cancelledOrders: orders.cancelled ?? 0,
    revenue: orders.revenue ?? 0,
    projects: projects.total,
  };
}

export type AdminOrder = {
  id: string;
  code: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  note: string;
  createdAt: number;
  confirmedAt: number | null;
  userEmail: string;
  userName: string;
};

export function listAdminOrders() {
  return db
    .prepare(
      `SELECT o.id, o.code, o.amount, o.status, o.note,
              o.created_at AS createdAt, o.confirmed_at AS confirmedAt,
              u.email AS userEmail, u.name AS userName
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC
       LIMIT 250`,
    )
    .all() as AdminOrder[];
}

export type AdminAudit = {
  id: string;
  action: string;
  targetId: string;
  detail: string;
  createdAt: number;
  adminEmail: string;
};

export function listAdminAudit(limit = 20) {
  return db
    .prepare(
      `SELECT a.id, a.action, a.target_id AS targetId, a.detail,
              a.created_at AS createdAt, u.email AS adminEmail
       FROM admin_audit a
       LEFT JOIN users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as AdminAudit[];
}

export function getAdminUsers() {
  return db
    .prepare(
      `SELECT u.*, o.code AS pending_code, o.created_at AS pending_created_at,
              p.updated_at AS project_updated_at
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'pending'
       LEFT JOIN projects p ON p.user_id = u.id
       ORDER BY u.created_at DESC`,
    )
    .all() as (UserRow & {
    pending_code: string | null;
    pending_created_at: number | null;
    project_updated_at: number | null;
  })[];
}

export function backupDatabase(destination: string) {
  const escaped = destination.replaceAll("'", "''");
  db.exec(`VACUUM INTO '${escaped}'`);
}
