"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* ---------- shared spring/easing tokens ---------- */
export const SPRING = { stiffness: 260, damping: 24, mass: 0.9 };
export const SOFT_SPRING = { stiffness: 180, damping: 22, mass: 1 };
export const SNAPPY = { stiffness: 400, damping: 30 };

const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;

/* ---------- FadeInUp ---------- */
export function FadeInUp({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- StaggerChildren ---------- */
export function StaggerGroup({
  children,
  staggerDelay = 0.07,
  className,
}: {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/* ---------- MagneticButton ---------- */
export function MagneticButton({
  children,
  onClick,
  disabled,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  strength?: number;
}) {
  const ref = useMagnetic(strength);
  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={SNAPPY}
    >
      {children}
    </motion.button>
  );
}

function useMagnetic(strength: number) {
  const ref = useReducedMotion() ? undefined : useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    let raf = 0;
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
    }
    function onLeave() {
      cancelAnimationFrame(raf);
      if (el) el.style.transform = "";
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el?.removeEventListener("mousemove", onMove);
      el?.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [ref, strength]);
  return ref;
}

/* ---------- AnimatedToggle ---------- */
export function AnimatedToggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.label
      className="flex cursor-pointer items-center justify-between gap-3 border border-rule bg-card px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3"
      whileHover={reduce ? {} : { backgroundColor: "#e1e9f3" }}
      whileTap={{ scale: 0.985 }}
      transition={SOFT_SPRING}
    >
      <span className="flex flex-col">
        <span className="font-display text-sm font-semibold text-ink">{title}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={String(hint)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-ink-soft"
          >
            {hint}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.span
        className="flex size-6 shrink-0 items-center justify-center border"
        animate={{
          background: checked ? "#1a56b0" : "#fbfdff",
          borderColor: checked ? "#1a56b0" : "#0e1c2e",
        }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="size-4 text-white"
          fill="none"
          aria-hidden
          initial={false}
          animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.5 }}
          transition={SNAPPY}
        >
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </motion.label>
  );
}

/* ---------- SegmentedControl ---------- */
export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const reduce = useReducedMotion();
  const activeIndex = options.findIndex((o) => o.value === value);
  const count = options.length;
  const thumbPct = 100 / count;
  const leftPct = activeIndex * thumbPct;

  return (
    <div className="relative flex border border-rule overflow-hidden">
      {/* sliding thumb */}
      {!reduce && (
        <motion.div
          className="absolute inset-y-0 bg-blue"
          style={{ width: `${thumbPct}%` }}
          animate={{ left: `${leftPct}%` }}
          transition={{ type: "spring", ...SPRING }}
        />
      )}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <motion.button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className="relative z-10 flex-1 whitespace-nowrap px-1.5 py-2 font-display text-[10px] font-semibold uppercase tracking-wide sm:px-2 sm:text-xs"
            animate={{
              color: isActive ? "#ffffff" : "#52647c",
              backgroundColor: !reduce && !isActive ? "rgba(0, 0, 0, 0)" : undefined,
            }}
            whileHover={!reduce && !isActive ? { color: "#0e1c2e" } : {}}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            {reduce && isActive ? (
              <span className="absolute inset-0 bg-blue" />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ---------- ShimmerSkeleton ---------- */
export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={`skeleton ${className ?? ""}`} />
  );
}

/* ---------- LoadingDots ---------- */
export function LoadingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block size-1.5 rounded-full bg-current"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/* ---------- ProgressRing ---------- */
export function ProgressRing({ size = 20 }: { size?: number }) {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: [circ, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/* ---------- PageTransition wrapper ---------- */
export function PageEnter({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}