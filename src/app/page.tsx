"use client";

import { useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent, type CSSProperties } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import CropEditor from "@/components/CropEditor";
import {
  SPRING,
  SOFT_SPRING,
  SNAPPY,
  FadeInUp,
  StaggerGroup,
  STAGGER_ITEM,
  AnimatedToggle,
  SegmentedControl,
  LoadingDots,
} from "@/components/Motion";

type Format = "png" | "jpeg" | "webp";
type Mode = "mock" | "free" | "live";

type Result = {
  blobUrl: string;
  name: string;
  source: string;
  bytes: number;
  mode: Mode;
};

const MODE_BADGE: Record<Mode, { label: string; className: string }> = {
  mock: { label: "MOCK", className: "bg-signal text-ink" },
  free: { label: "FREE", className: "bg-scope text-white" },
  live: { label: "LIVE", className: "bg-blue text-white" },
};

const WIDTHS = [
  { value: 390, label: "Ponsel" },
  { value: 768, label: "Tablet" },
  { value: 1280, label: "Laptop" },
  { value: 1920, label: "Desktop" },
];

const FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

function hostLabel(input: string): string {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
    return url.hostname.replace(/[^a-z0-9.-]/gi, "_");
  } catch {
    return "screenshot";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extFromType(type: string, fallback: string): string {
  if (type.includes("svg")) return "svg";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("png")) return "png";
  return fallback;
}

/* ---------- parallax headline ---------- */
const HEADLINE_LINES = ["Tangkap", "halaman web", "apa pun."];

function ParallaxHeadline() {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();

  function onMove(e: ReactMouseEvent) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.setProperty("--px", String(cx));
    ref.current.style.setProperty("--py", String(cy));
  }
  function onLeave() {
    if (!ref.current) return;
    ref.current.style.setProperty("--px", "0");
    ref.current.style.setProperty("--py", "0");
  }

  return (
    <motion.h1
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      variants={STAGGER_ITEM}
      className="font-display text-[clamp(1.75rem,7vw,2.75rem)] font-black uppercase leading-[1.08] tracking-[-0.01em] text-blue"
      style={{ perspective: 800, "--px": 0, "--py": 0 } as CSSProperties}
    >
      {HEADLINE_LINES.map((line, li) => (
        <span key={li} className="block">
          {Array.from(line).map((ch, ci) => (
            <motion.span
              key={ci}
              className="inline-block will-change-transform"
              initial={reduce ? false : { opacity: 0, y: "110%", rotateX: -70 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3 + (li * line.length + ci) * 0.028,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              style={{
                transformOrigin: "50% 100%",
                ...(reduce ? {} : {
                  transform: `translate(calc(var(--px) * ${(li + 1) * 4}px), calc(var(--py) * ${(li + 1) * 3}px))`,
                  transition: "transform 0.18s ease-out",
                }),
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}



export default function Home() {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [fullPage, setFullPage] = useState(true);
  const [hd, setHd] = useState(false);
  const [width, setWidth] = useState<number>(1280);
  const [format, setFormat] = useState<Format>("png");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const reduce = useReducedMotion();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    if (result) URL.revokeObjectURL(result.blobUrl);
    setResult(null);

    try {
      const response = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, fullPage, width, format, hd }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `Permintaan gagal (${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const headerMode = response.headers.get("X-Capture-Mode");
      const mode: Mode = headerMode === "mock" || headerMode === "free" ? headerMode : "live";

      setResult({
        blobUrl,
        name: `${hostLabel(url)}-${Date.now()}.${extFromType(blob.type, format)}`,
        source: url,
        bytes: blob.size,
        mode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh">
      <div aria-hidden className="paper-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 md:py-6 lg:px-8">
        {/* ---------- header ---------- */}
        <motion.header
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="flex items-center justify-between gap-3 border-b border-rule pb-3 sm:pb-4"
        >
          <div className="flex items-center gap-2 sm:gap-2.5">
            <motion.span
              className="text-blue"
              whileHover={reduce ? {} : { rotate: -8, scale: 1.1 }}
              transition={SNAPPY}
            >
              <svg viewBox="0 0 32 32" className="size-6 sm:size-7" fill="none" aria-hidden>
                <rect x="3" y="5" width="26" height="22" rx="2.5" stroke="currentColor" strokeWidth="2.2" />
                <line x1="3" y1="11" x2="29" y2="11" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="16" cy="19" r="4.6" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="16" cy="19" r="1.4" fill="currentColor" />
                <circle cx="7" cy="8" r="1.1" fill="currentColor" />
                <circle cx="11" cy="8" r="1.1" fill="currentColor" />
              </svg>
            </motion.span>
            <span className="flex items-baseline gap-2 sm:gap-3">
              <span className="font-display text-lg font-bold tracking-[0.08em] text-blue sm:text-xl">SNAPWEB</span>
              <span className="hidden text-sm text-ink-soft md:inline">tangkap halaman web</span>
            </span>
          </div>
          <span className="hidden font-display text-[11px] uppercase tracking-[0.1em] text-ink-soft sm:block">
            full page · hd · crop
          </span>
        </motion.header>

        {/* ---------- main grid ---------- */}
        <main className="mt-6 grid flex-1 gap-6 pb-6 sm:mt-8 sm:gap-8 md:pb-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-10">
          {/* ===== left panel ===== */}
          <StaggerGroup className="flex flex-col gap-5 sm:gap-6" staggerDelay={0.09}>
            <ParallaxHeadline />

            <motion.p variants={STAGGER_ITEM} className="max-w-sm text-sm leading-relaxed text-ink-soft sm:text-base">
              Tempel URL, pilih full page atau viewport, lalu crop bagian yang kamu mau.
            </motion.p>

            <motion.form
              variants={STAGGER_ITEM}
              onSubmit={handleSubmit}
              className="panel-frame paper-grid flex flex-col gap-4 p-4 sm:gap-5 sm:p-5"
            >
              {/* URL input with focus ring animation */}
              <div className="flex flex-col gap-2">
                <label htmlFor="url" className="font-display text-sm font-semibold text-ink">
                  Alamat halaman
                </label>
                <div className="relative">
                  <motion.div
                    className="pointer-events-none absolute -inset-px border-2 border-blue"
                    animate={{ opacity: focused ? 1 : 0, scale: focused ? 1 : 0.995 }}
                    transition={{ duration: 0.2 }}
                  />
                  <input
                    id="url"
                    type="text"
                    inputMode="url"
                    value={url}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="h-11 w-full border border-rule bg-card px-3 text-[15px] text-ink outline-none transition-colors duration-200 placeholder:text-ink-soft/60"
                  />
                </div>
              </div>

              {/* Width segmented */}
              <div className="flex flex-col gap-2">
                <span className="font-display text-sm font-semibold text-ink">Lebar viewport</span>
                <SegmentedControl value={width} onChange={setWidth} options={WIDTHS} />
              </div>

              {/* Format segmented */}
              <div className="flex flex-col gap-2">
                <span className="font-display text-sm font-semibold text-ink">Format</span>
                <SegmentedControl value={format} onChange={(v) => setFormat(v as Format)} options={FORMATS} />
              </div>

              {/* Toggles */}
              <AnimatedToggle
                checked={fullPage}
                onChange={setFullPage}
                title="Full page"
                hint={fullPage ? "Seluruh tinggi halaman" : "Hanya area viewport"}
              />
              <AnimatedToggle
                checked={hd}
                onChange={setHd}
                title="HD (2×)"
                hint={hd ? "Resolusi ganda, kuota terbatas" : "Resolusi standar"}
              />

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="btn-solid h-12 w-full px-6 text-[15px]"
                whileHover={reduce || loading ? {} : { scale: 1.015 }}
                whileTap={reduce || loading ? {} : { scale: 0.985 }}
                transition={SNAPPY}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {loading ? (
                    <motion.span
                      key="loading"
                      className="inline-flex items-center gap-1"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      Menangkap halaman
                      <LoadingDots />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      Tangkap halaman
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.form>
          </StaggerGroup>

          {/* ===== right preview panel ===== */}
          <FadeInUp delay={0.25}>
            <motion.div
              layout={!reduce}
              className="flex min-h-[320px] flex-col border border-rule bg-card shadow-[4px_4px_0_rgba(14,28,46,0.12)] sm:min-h-[440px] sm:shadow-[6px_6px_0_rgba(14,28,46,0.12)]"
            >
              {/* fake browser chrome */}
              <div className="flex items-center gap-2 border-b border-rule bg-band px-3 py-2">
                {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
                  <motion.span
                    key={c}
                    className="size-2.5 rounded-full"
                    style={{ background: c }}
                    whileHover={reduce ? {} : { scale: 1.4 }}
                    initial={reduce ? false : { opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.08, ...SOFT_SPRING }}
                  />
                ))}
                <div className="ml-3 flex-1 truncate border border-rule bg-card px-3 py-1 font-display text-xs text-ink-soft">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={url || "preview"}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="block truncate"
                    >
                      {url || "preview"}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              {/* content area */}
              <div className={`paper-grid relative flex flex-1 items-center justify-center overflow-hidden bg-paper ${loading ? "scan-sweep" : ""}`}>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="skeleton"
                      className="w-full p-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <motion.div
                        className="skeleton mb-5 h-4 w-1/3"
                        animate={reduce ? {} : { width: ["20%", "38%", "20%"] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="flex flex-col gap-3">
                        {[100, 83, 66].map((w, i) => (
                          <motion.div
                            key={i}
                            className="skeleton h-3"
                            style={{ width: `${w}%` }}
                            initial={reduce ? false : { opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                          />
                        ))}
                        <motion.div
                          className="skeleton mt-2 h-44 w-full"
                          initial={reduce ? false : { opacity: 0, scaleY: 0.9 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ delay: 0.35, duration: 0.5 }}
                        />
                      </div>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.96, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={SOFT_SPRING}
                      className="mx-6 max-w-sm border border-danger bg-danger/10 px-5 py-4 text-center text-sm text-danger"
                    >
                      {error}
                    </motion.div>
                  ) : result ? (
                    <motion.div
                      key={result.blobUrl}
                      className="flex h-full w-full flex-col"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      {/* result toolbar */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule bg-band px-3 py-2 sm:px-4 sm:py-2.5">
                        <motion.span
                          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.15, ...SPRING }}
                          className={`px-2 py-0.5 font-display text-[11px] font-semibold tracking-wide ${MODE_BADGE[result.mode].className}`}
                        >
                          {MODE_BADGE[result.mode].label}
                        </motion.span>
                        <span className="order-last w-full truncate text-xs text-ink-soft sm:order-none sm:w-auto sm:max-w-[180px]">
                          {result.source}
                        </span>
                        <span className="font-display text-xs tabular-nums text-ink-soft">
                          {formatBytes(result.bytes)}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <motion.a
                            href={result.blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost h-8 px-3 text-xs"
                            whileHover={reduce ? {} : { y: -1 }}
                            whileTap={{ scale: 0.96 }}
                            transition={SNAPPY}
                          >
                            Buka
                          </motion.a>
                          <motion.a
                            href={result.blobUrl}
                            download={result.name}
                            className="btn-solid h-8 px-3 text-xs"
                            whileHover={reduce ? {} : { y: -1 }}
                            whileTap={{ scale: 0.96 }}
                            transition={SNAPPY}
                          >
                            Unduh
                          </motion.a>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-4">
                        <CropEditor src={result.blobUrl} alt="Hasil screenshot" filename={result.name} />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      className="flex flex-col items-center gap-3 px-4 text-center sm:gap-4 sm:px-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.span
                        className="text-ink/20"
                        animate={reduce ? {} : { y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <svg viewBox="0 0 48 48" className="size-12 sm:size-16" fill="none" aria-hidden>
                          <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" />
                          <ellipse cx="24" cy="24" rx="7" ry="16" stroke="currentColor" strokeWidth="2" />
                          <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="2" />
                          <path d="M9.5 17.5h29M9.5 30.5h29" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </motion.span>
                      <p className="max-w-[14rem] text-xs text-ink-soft sm:max-w-[16rem] sm:text-sm">
                        Hasil tangkapan muncul di sini.<br className="sm:hidden" /> Tempel URL di panel atas.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </FadeInUp>
        </main>
      </div>
    </div>
  );
}