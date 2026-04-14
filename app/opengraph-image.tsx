import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Curator — FRC AI Knowledge Base";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0f0f0f", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div style={{
          position: "absolute", top: 0, right: 0, width: 600, height: 400,
          background: "radial-gradient(circle, rgba(237,28,36,0.15) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, width: 500, height: 350,
          background: "radial-gradient(circle, rgba(0,102,179,0.12) 0%, transparent 70%)",
        }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, zIndex: 1 }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%", border: "3px solid #ED1C24",
            background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#ED1C24", fontSize: 48, fontWeight: 700 }}>C</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#F5F5F5", fontSize: 80, fontWeight: 800, letterSpacing: "-2px" }}>CURATOR</span>
            <span style={{ color: "#8A8A8A", fontSize: 28, letterSpacing: "4px" }}>FRC AI KNOWLEDGE BASE</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {["Game Manuals", "Team Updates", "Web Search"].map((tag) => (
              <span key={tag} style={{
                background: "rgba(237,28,36,0.15)", border: "1px solid rgba(237,28,36,0.3)",
                color: "#ED1C24", padding: "6px 16px", borderRadius: 99, fontSize: 18,
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
