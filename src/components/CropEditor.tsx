"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SPRING, SNAPPY, SOFT_SPRING } from "@/components/Motion";

type Box = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "ne" | "sw" | "se";
type DragState =
  | { kind: "new"; startX: number; startY: number }
  | { kind: "move"; startX: number; startY: number; origin: Box }
  | { kind: "resize"; startX: number; startY: number; origin: Box; handle: Handle };

const MIN = 24;

function clampBox(box: Box, bounds: { width: number; height: number }): Box {
  const x = Math.max(0, Math.min(box.x, bounds.width));
  const y = Math.max(0, Math.min(box.y, bounds.height));
  const w = Math.max(0, Math.min(box.w, bounds.width - x));
  const h = Math.max(0, Math.min(box.h, bounds.height - y));
  return { x, y, w, h };
}

export default function CropEditor({
  src,
  alt,
  filename,
}: {
  src: string;
  alt: string;
  filename: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [display, setDisplay] = useState({ width: 0, height: 0 });
  const reduce = useReducedMotion();

  function measure() {
    const img = imgRef.current;
    if (!img) return;
    setDisplay({ width: img.clientWidth, height: img.clientHeight });
  }

  useEffect(() => {
    function onResize() {
      setBox(null);
      measure();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function relPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!display.width) return;
    const handle = (event.target as HTMLElement).dataset.handle as Handle | undefined;
    const point = relPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (handle && box) {
      dragRef.current = { kind: "resize", startX: point.x, startY: point.y, origin: box, handle };
      return;
    }
    if (
      box &&
      point.x >= box.x &&
      point.x <= box.x + box.w &&
      point.y >= box.y &&
      point.y <= box.y + box.h
    ) {
      dragRef.current = { kind: "move", startX: point.x, startY: point.y, origin: box };
      return;
    }
    dragRef.current = { kind: "new", startX: point.x, startY: point.y };
    setBox({ x: point.x, y: point.y, w: 0, h: 0 });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = relPoint(event);

    if (drag.kind === "new") {
      const x = Math.min(drag.startX, point.x);
      const y = Math.min(drag.startY, point.y);
      setBox(clampBox({ x, y, w: Math.abs(point.x - drag.startX), h: Math.abs(point.y - drag.startY) }, display));
      return;
    }

    if (drag.kind === "move") {
      setBox(
        clampBox(
          { ...drag.origin, x: drag.origin.x + (point.x - drag.startX), y: drag.origin.y + (point.y - drag.startY) },
          display,
        ),
      );
      return;
    }

    const { origin, handle } = drag;
    const right = origin.x + origin.w;
    const bottom = origin.y + origin.h;
    let next: Box;

    if (handle === "nw") {
      const x = Math.min(point.x, right - MIN);
      const y = Math.min(point.y, bottom - MIN);
      next = { x, y, w: right - x, h: bottom - y };
    } else if (handle === "ne") {
      const y = Math.min(point.y, bottom - MIN);
      next = { x: origin.x, y, w: Math.max(MIN, point.x - origin.x), h: bottom - y };
    } else if (handle === "sw") {
      const x = Math.min(point.x, right - MIN);
      next = { x, y: origin.y, w: right - x, h: Math.max(MIN, point.y - origin.y) };
    } else {
      next = { x: origin.x, y: origin.y, w: Math.max(MIN, point.x - origin.x), h: Math.max(MIN, point.y - origin.y) };
    }
    setBox(clampBox(next, display));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function crop() {
    const img = imgRef.current;
    if (!img || !box || box.w < 1 || box.h < 1 || !display.width) return;

    const scale = img.naturalWidth / display.width;
    const sx = Math.round(box.x * scale);
    const sy = Math.round(box.y * scale);
    const sw = Math.max(1, Math.round(box.w * scale));
    const sh = Math.max(1, Math.round(box.h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `crop-${filename}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    }, "image/png");
  }

  const active = box && box.w > 0 && box.h > 0;

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative touch-none select-none overflow-hidden border border-rule bg-card"
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={measure}
          draggable={false}
          className="block w-full"
        />

        <AnimatePresence>
          {active && box && (
            <motion.div
              key="crop-box"
              className="pointer-events-none absolute border-2 border-blue shadow-[0_0_0_9999px_rgba(14,28,46,0.5)]"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={SOFT_SPRING}
            >
              {(["nw", "ne", "sw", "se"] as const).map((h, i) => {
                const posClass =
                  h === "nw"
                    ? "-left-1.5 -top-1.5 cursor-nwse-resize"
                    : h === "ne"
                      ? "-right-1.5 -top-1.5 cursor-nesw-resize"
                      : h === "sw"
                        ? "-bottom-1.5 -left-1.5 cursor-nesw-resize"
                        : "-bottom-1.5 -right-1.5 cursor-nwse-resize";
                return (
                  <motion.span
                    key={h}
                    data-handle={h}
                    className={`pointer-events-auto absolute size-3 rounded-full border-2 border-blue bg-white ${posClass}`}
                    initial={reduce ? false : { opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.08 + i * 0.04, ...SNAPPY }}
                    whileHover={reduce ? {} : { scale: 1.35 }}
                    whileTap={{ scale: 1.15 }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex min-h-8 items-center justify-between gap-3">
        <motion.span
          className="text-xs text-ink-soft tabular-nums"
          key={active && box ? `${Math.round(box.w)}x${Math.round(box.h)}` : "hint"}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {active && box
            ? `${Math.round(box.w)} \u00D7 ${Math.round(box.h)} px`
            : "Tarik di gambar untuk memilih area"}
        </motion.span>
        <AnimatePresence>
          {active && (
            <motion.div
              key="actions"
              className="flex gap-2"
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={SOFT_SPRING}
            >
              <motion.button
                type="button"
                onClick={() => setBox(null)}
                className="btn-ghost h-8 px-3 text-xs"
                whileHover={reduce ? {} : { y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={SNAPPY}
              >
                Reset
              </motion.button>
              <motion.button
                type="button"
                onClick={crop}
                className="btn-solid h-8 px-3 text-xs"
                whileHover={reduce ? {} : { y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={SNAPPY}
              >
                Crop &amp; unduh
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}