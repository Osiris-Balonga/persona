import { ImageResponse } from "next/og";

export const alt = "Persona — fictional people for products and tests";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const french = locale === "fr";

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#fafbff", color: "#171b2e", fontFamily: "Arial, sans-serif", padding: 64, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 46, height: 46, background: "#2ee6a6" }} />
          <div style={{ display: "flex", width: 46, height: 46, background: "#2c3ebf", transform: "skew(20deg)" }} />
          <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: -2, marginLeft: 8 }}>PERSONA</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 910 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#2c3ebf", textTransform: "uppercase" }}>
            {french ? "API PUBLIQUE · SANS CLÉ" : "PUBLIC API · NO KEY REQUIRED"}
          </span>
          <span style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.07, letterSpacing: -3 }}>
            {french ? "Des personnes fictives pour vos produits et vos tests." : "Fictional people for your products and tests."}
          </span>
          <span style={{ fontSize: 25, color: "#596174" }}>
            {french ? "Des profils cohérents, des données réalistes." : "Coherent profiles. Realistic data."}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22, color: "#2c3ebf", fontWeight: 700 }}>
          <span style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: "#2ee6a6" }} />
          GET /people
        </div>
      </div>
      <div style={{ display: "flex", position: "absolute", width: 360, height: 360, borderRadius: 180, background: "#e9edff", right: -120, top: -110 }} />
      <div style={{ display: "flex", position: "absolute", width: 240, height: 240, borderRadius: 120, background: "#e3fff5", right: 80, bottom: -130 }} />
    </div>,
    size,
  );
}
