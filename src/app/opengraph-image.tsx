import { ImageResponse } from "next/og";

export const alt = "Snapweb — tangkap halaman web: full page, viewport, dan crop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f3f8",
          backgroundImage:
            "linear-gradient(rgba(14,28,46,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(14,28,46,0.09) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "#0e1c2e",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="5" width="26" height="22" rx="2.5" stroke="#1a56b0" strokeWidth="2.2" />
            <line x1="3" y1="11" x2="29" y2="11" stroke="#1a56b0" strokeWidth="2.2" />
            <circle cx="16" cy="19" r="4.6" stroke="#1a56b0" strokeWidth="2.2" />
            <circle cx="16" cy="19" r="1.4" fill="#1a56b0" />
            <circle cx="7" cy="8" r="1.1" fill="#1a56b0" />
            <circle cx="11" cy="8" r="1.1" fill="#1a56b0" />
          </svg>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: 8, color: "#1a56b0" }}>
            SNAPWEB
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: 720,
            height: 2,
            margin: "36px 0 44px",
            background: "linear-gradient(90deg, transparent, #1a56b0, transparent)",
          }}
        />

        <div style={{ display: "flex", fontSize: 40, color: "#52647c" }}>
          Tangkap halaman web apa pun — full page · HD · crop
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 48,
            gap: 16,
          }}
        >
          {["PNG", "JPEG", "WebP", "HD 2×", "Crop"].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "10px 28px",
                fontSize: 26,
                fontWeight: 700,
                color: "#ffffff",
                background: "#1a56b0",
                border: "2px solid #0e1c2e",
                boxShadow: "4px 4px 0 rgba(26,86,176,0.35)",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
