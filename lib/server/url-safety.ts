import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/**
 * yt-dlp fetches the URL itself, so a public-looking host that redirects or
 * resolves to an internal address is still a server-side request forgery
 * vector. Keep link imports to the platforms the editor actually advertises.
 */
export const SOURCE_HOSTS = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "tiktok.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "threads.com",
  "threads.net",
] as const;

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

export function isAllowedSourceHost(host: string) {
  const normalized = normalizeHost(host);
  return SOURCE_HOSTS.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const value = address.toLowerCase().split("%")[0];
  if (value === "::" || value === "::1") return true;
  // IPv4-mapped addresses can hide 127.0.0.1 or 169.254.169.254.
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice("::ffff:".length);
    return isIP(mapped) === 4 ? isPrivateIpv4(mapped) : true;
  }
  // NAT64 and other transition ranges should not be reachable from imports.
  if (value.startsWith("64:ff9b:") || value.startsWith("2001:db8:")) return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith("ff")) return true;
  return false;
}

export function isPrivateIp(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

type SafeUrlOptions = {
  allowedHosts?: readonly string[];
  requireHttps?: boolean;
};

export async function assertSafeRemoteUrl(raw: string, options: SafeUrlOptions = {}) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL tidak valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Hanya URL http/https yang didukung.");
  }
  if (options.requireHttps && url.protocol !== "https:") {
    throw new Error("URL harus memakai HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("URL tidak boleh berisi kredensial.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error("Port URL tidak didukung.");
  }

  const host = normalizeHost(url.hostname);
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    host === "instance-data" ||
    !host.includes(".")
  ) {
    throw new Error("Link mengarah ke alamat yang tidak diizinkan.");
  }

  if (options.allowedHosts && !options.allowedHosts.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  )) {
    throw new Error("Platform link ini belum didukung.");
  }

  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error("Link mengarah ke alamat internal.");
    }
    return url;
  }

  let records: Array<{ address: string }>;
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("Domain link tidak bisa dijangkau.");
  }
  if (records.length === 0) {
    throw new Error("Domain link tidak bisa dijangkau.");
  }
  if (records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Link mengarah ke alamat internal.");
  }

  return url;
}

export function assertSafeSourceUrl(raw: string) {
  return assertSafeRemoteUrl(raw, { allowedHosts: SOURCE_HOSTS });
}

export function assertSafeFetchUrl(raw: string) {
  return assertSafeRemoteUrl(raw, { requireHttps: true });
}
