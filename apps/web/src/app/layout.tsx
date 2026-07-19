import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { VISIONOS_COLORS } from "@visionos/shared";

export const metadata: Metadata = {
  title: "VisionOS | FIFA World Cup Smart Stadium AI OS",
  description: "Futuristic Command Center and Operating System for FIFA World Cup Smart Stadiums.",
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" style={{ backgroundColor: VISIONOS_COLORS.BACKGROUND_DARK, color: VISIONOS_COLORS.TEXT_PRIMARY }}>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', -apple-system, sans-serif", backgroundColor: VISIONOS_COLORS.BACKGROUND_DARK, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {children}
      </body>
    </html>
  );
}
