import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Curator Support";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SupportOGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #08111b 0%, #0f0f0f 58%, #161616 100%)",
          color: "#f5f5f5",
          padding: "56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -40,
            width: 460,
            height: 460,
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(0,102,179,0.32) 0%, transparent 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 420,
            height: 420,
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(237,28,36,0.22) 0%, transparent 72%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 24,
              color: "#9acbff",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "999px",
                background: "#0066B3",
                boxShadow: "0 0 24px rgba(0,102,179,0.75)",
              }}
            />
            Curator Support
          </div>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 0.95 }}>
            Report issues with
            <br />
            enough context to fix them.
          </div>
          <div style={{ maxWidth: 820, fontSize: 28, lineHeight: 1.35, color: "#b9c2cc" }}>
            Bug reports, feature requests, account issues, and privacy questions for Curator&apos;s FRC assistant.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, position: "relative" }}>
          {["Bug reports", "Feature requests", "Privacy + account"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                padding: "12px 20px",
                fontSize: 22,
                color: "#f5f5f5",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
