import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", background: "#0f0f0f",
        display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 40,
      }}>
        <div style={{
          width: 130, height: 130, borderRadius: "50%", border: "4px solid #ED1C24",
          background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#ED1C24", fontSize: 64, fontWeight: 800 }}>C</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
