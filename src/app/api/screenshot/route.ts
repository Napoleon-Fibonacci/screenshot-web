import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { clamp, isImageFormat, isPrivateIp, normalizeUrl } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

type Provider = "screenshotone" | "free" | "mock";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function resolveProvider(accessKey: string | undefined): Provider {
  const explicit = process.env.CAPTURE_PROVIDER as Provider | undefined;
  if (explicit === "screenshotone" || explicit === "free" || explicit === "mock") return explicit;
  return accessKey ? "screenshotone" : "free";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function placeholderSvg(target: string, width: number, fullPage: boolean, format: string): string {
  const height = fullPage ? Math.round(width * 1.4) : Math.round(width * 0.625);
  const rows = [
    "MOCK CAPTURE",
    target.length > 70 ? `${target.slice(0, 67)}...` : target,
    `viewport ${width}px · ${format.toUpperCase()} · ${fullPage ? "full page" : "viewport"}`,
  ];
  const text = rows
    .map((line, index) => {
      const size = index === 0 ? 20 : 26;
      const weight = index === 0 ? 600 : 400;
      const fill = index === 0 ? "#38bdf8" : "#e4e4e7";
      const y = Math.round(height * 0.44) + index * 44;
      return `<text x="50%" y="${y}" fill="${fill}" font-family="system-ui, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="middle">${escapeXml(line)}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0b0f17"/>
  <rect width="100%" height="56" fill="#111827"/>
  <circle cx="28" cy="28" r="5" fill="#ef4444"/>
  <circle cx="48" cy="28" r="5" fill="#f59e0b"/>
  <circle cx="68" cy="28" r="5" fill="#22c55e"/>
  <rect x="28" y="${Math.round(height * 0.44) - 64}" width="${width - 56}" height="${rows.length * 44 + 40}" rx="16" fill="#151c28" stroke="#1f2937"/>
  ${text}
</svg>`;
}

type CaptureResult = { body: ArrayBuffer; contentType: string };

async function captureWithScreenshotOne(
  accessKey: string,
  target: string,
  width: number,
  height: number,
  fullPage: boolean,
  hd: boolean,
  format: string,
): Promise<CaptureResult> {
  const params = new URLSearchParams({
    access_key: accessKey,
    url: target,
    format,
    full_page: String(fullPage),
    viewport_width: String(width),
    viewport_height: String(height),
    device_scale_factor: hd ? "2" : "1",
    block_ads: "true",
    timeout: "30",
  });

  const response = await fetch(`https://api.screenshotone.com/take?${params.toString()}`, {
    signal: AbortSignal.timeout(50000),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(
      `ScreenshotOne menolak permintaan (${response.status}). ${detail.slice(0, 160)}`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? `image/${format}`,
  };
}

async function captureWithMshots(target: string, width: number, height: number): Promise<CaptureResult> {
  const url = `https://s0.wp.com/mshots/v1/${encodeURIComponent(target)}?w=${width}&h=${height}`;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "image/*" },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (response.status === 200 && contentType.startsWith("image/") && !contentType.includes("gif")) {
      const body = await response.arrayBuffer();
      if (body.byteLength > 2000) return { body, contentType };
    }
    await sleep(2500);
  }

  throw new Error("mShots belum menyelesaikan tangkapan");
}

async function captureWithThumio(target: string, width: number, height: number): Promise<CaptureResult> {
  const url = `https://image.thum.io/get/width/${width}/crop/${height}/noanimate/${target}`;
  const response = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "image/*" },
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) {
    throw new Error(`thum.io gagal (${response.status})`);
  }

  return { body: await response.arrayBuffer(), contentType };
}

async function captureWithMicrolink(
  target: string,
  width: number,
  height: number,
  fullPage: boolean,
  hd: boolean,
): Promise<CaptureResult> {
  const params = new URLSearchParams({
    url: target,
    screenshot: "true",
    meta: "false",
    "viewport.width": String(width),
    "viewport.height": String(height),
    "viewport.deviceScaleFactor": hd ? "2" : "1",
  });
  if (fullPage) params.set("screenshot.fullPage", "true");

  const response = await fetch(`https://api.microlink.io/?${params.toString()}`, {
    signal: AbortSignal.timeout(45000),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { status?: string; message?: string; data?: { screenshot?: { url?: string; type?: string } } }
    | null;

  const screenshot = payload?.data?.screenshot;
  if (!response.ok || payload?.status !== "success" || !screenshot?.url) {
    throw new Error(payload?.message ?? `Layanan Microlink menolak permintaan (${response.status})`);
  }

  const image = await fetch(screenshot.url, {
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!image.ok) {
    throw new Error(`Gagal mengunduh hasil HD (${image.status})`);
  }

  return {
    body: await image.arrayBuffer(),
    contentType: screenshot.type ? `image/${screenshot.type}` : (image.headers.get("content-type") ?? "image/png"),
  };
}

async function captureWithFree(
  target: string,
  width: number,
  height: number,
  fullPage: boolean,
  hd: boolean,
): Promise<CaptureResult> {
  // HD & full page: microlink satu-satunya yang mendukung
  if (hd || fullPage) return captureWithMicrolink(target, width, height, fullPage, hd);

  // Viewport biasa: microlink jadi opsi pertama, lalu cadangan mShots, terakhir thum.io
  try {
    return await captureWithMicrolink(target, width, height, fullPage, hd);
  } catch {
    try {
      return await captureWithMshots(target, width, height);
    } catch {
      return await captureWithThumio(target, width, height);
    }
  }
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof Error && "status" in error) {
    const status = (error as Error & { status?: number }).status;
    return status === 402 || status === 429;
  }
  return false;
}

export async function POST(request: Request) {
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  const provider = resolveProvider(accessKey);

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body harus berformat JSON" }, { status: 400 });
  }

  let target: string;
  try {
    target = normalizeUrl(String(payload.url ?? ""));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  // Cegah SSRF lewat DNS rebinding: host yang resolve ke IP internal ditolak.
  try {
    const records = await lookup(new URL(target).hostname, { all: true });
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        return NextResponse.json({ error: "Host internal tidak diizinkan" }, { status: 400 });
      }
    }
  } catch {
    return NextResponse.json({ error: "Domain tidak dapat di-resolve" }, { status: 400 });
  }

  const width = clamp(Number(payload.width) || 1280, 320, 2560);
  const height = clamp(Number(payload.height) || 800, 240, 2560);
  const fullPage = payload.fullPage !== false;
  const hd = payload.hd === true;
  const format = isImageFormat(payload.format) ? payload.format : "png";

  try {
    if (provider === "mock") {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return new Response(placeholderSvg(target, width, fullPage, format), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-store",
          "X-Capture-Mode": "mock",
        },
      });
    }

    let result: CaptureResult;
    let captureMode: "live" | "free" = "free";

    // ScreenshotOne hanya untuk mode HD; selain itu pakai rantai gratis
    if (hd && provider === "screenshotone") {
      try {
        result = await captureWithScreenshotOne(accessKey!, target, width, height, fullPage, hd, format);
        captureMode = "live";
      } catch (error) {
        // Kuota abis / kena rate limit → turun ke rantai gratis
        if (isQuotaError(error)) {
          result = await captureWithFree(target, width, height, fullPage, hd);
        } else {
          throw error;
        }
      }
    } else {
      result = await captureWithFree(target, width, height, fullPage, hd);
    }

    return new Response(result.body, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.body.byteLength),
        "Cache-Control": "no-store",
        "X-Capture-Mode": captureMode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menangkap halaman" },
      { status: 502 },
    );
  }
}
