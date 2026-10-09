import { isIP } from "node:net";

const ALLOWED_FORMATS = ["png", "jpeg", "webp"] as const;
export type ImageFormat = (typeof ALLOWED_FORMATS)[number];

const MAX_URL_LENGTH = 2048;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function isImageFormat(value: unknown): value is ImageFormat {
  return typeof value === "string" && (ALLOWED_FORMATS as readonly string[]).includes(value);
}

export function isPrivateIp(ip: string): boolean {
  const v6 = isIP(ip) === 6;
  if (v6) return isPrivateIpv6(ip);
  return isPrivateIpv4(ip);
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // APIPA/link-local 169.254.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 192 && b === 0 && Number(parts[2]) === 0) return true; // benchmark 192.0.0.0/24
  if (a === 198 && b >= 18 && b <= 19) return true; // benchmark 198.18.0.0/15
  if (a === 255) return true; // broadcast 255.255.255.255/32
  return false;
}

function expandIpv6(ip: string): string[] {
  const lower = ip.toLowerCase();
  if (lower.includes("::")) {
    const [left, right] = lower.split("::");
    const leftParts = left ? left.split(":") : [];
    const rightParts = right ? right.split(":") : [];
    const missing = 8 - leftParts.length - rightParts.length;
    return [...leftParts, ...Array(missing).fill("0"), ...rightParts];
  }
  return lower.split(":");
}

function isPrivateIpv6(ip: string): boolean {
  const parts = expandIpv6(ip);
  if (parts.length !== 8) return false;

const first = Number.parseInt(parts[0], 16);
  const isZero = (part: string) => Number.parseInt(part, 16) === 0;

  // 128-bit nol / unspecified "::"
  if (parts.every(isZero)) return true;
  // loopback ::1
  if (first === 0 && parts.slice(1, 7).every(isZero) && parts[7] === "1") return true;
  // IPv4-mapped ::ffff:a.b.c.d — cek IPv4 yang dikubur di dalam
  if (first === 0 && parts[5] === "ffff") {
    const a = Number.parseInt(parts[6], 16) >> 8;
    const b = Number.parseInt(parts[6], 16) & 255;
    const c = Number.parseInt(parts[7], 16) >> 8;
    const d = Number.parseInt(parts[7], 16) & 255;
    return isPrivateIpv4(`${a}.${b}.${c}.${d}`);
  }
  // link-local fe80::/10
  if (first >= 0xfe80 && first <= 0xfebf) return true;
  // ULA fc00::/7
  if ((first & 0xfe00) === 0xfc00) return true;
  // link-local multicast ff02::/16
  if (first === 0xff02) return true;
  return false;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;

  if (h.includes(":")) {
    return isPrivateIpv6(h);
  }
  const version = isIP(h);
  return version === 4 && isPrivateIpv4(h);
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("URL wajib diisi");
  if (trimmed.length > MAX_URL_LENGTH) throw new Error("URL terlalu panjang");

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("URL tidak valid");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Hanya URL http/https yang didukung");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URL tidak boleh berisi kredensial");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Host internal tidak diizinkan");
  }
  return parsed.toString();
}
