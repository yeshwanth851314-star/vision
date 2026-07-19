"use client";

import React from "react";

export default function CommandCenterSkeleton() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0A0E1A",
        padding: "2rem",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
        gap: "2rem",
        pointerEvents: "none",
        zIndex: 5
      }}
    >
      {/* Top Header Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="shimmer-bg" style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
          <div className="shimmer-bg" style={{ width: "120px", height: "18px", borderRadius: "4px" }} />
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="shimmer-bg" style={{ width: "90px", height: "32px", borderRadius: "16px" }} />
          <div className="shimmer-bg" style={{ width: "140px", height: "32px", borderRadius: "16px" }} />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: "2rem", flex: 1 }}>
        {/* Left Side Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "16px",
                padding: "1.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
                background: "rgba(255,255,255,0.01)"
              }}
            >
              <div className="shimmer-bg" style={{ width: "55%", height: "12px", borderRadius: "3px" }} />
              <div className="shimmer-bg" style={{ width: "85%", height: "24px", borderRadius: "4px" }} />
              <div className="shimmer-bg" style={{ width: "35%", height: "10px", borderRadius: "2px" }} />
            </div>
          ))}
        </div>

        {/* Center Digital Twin Viewport */}
        <div
          style={{
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            background: "rgba(0, 255, 204, 0.01)"
          }}
        >
          {/* Shimmering Stadium Bowl Ring */}
          <div
            style={{
              width: "280px",
              height: "160px",
              borderRadius: "50%",
              border: "2px solid rgba(0, 255, 204, 0.06)",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(0, 255, 204, 0.02)"
            }}
          >
            <div
              style={{
                width: "220px",
                height: "110px",
                borderRadius: "50%",
                border: "1px dashed rgba(0, 255, 204, 0.08)"
              }}
            />
          </div>
          <div className="shimmer-bg" style={{ width: "180px", height: "14px", borderRadius: "4px", marginTop: "2rem" }} />
        </div>

        {/* Right Side Swarm Audit Logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="shimmer-bg" style={{ width: "70%", height: "16px", borderRadius: "4px", marginBottom: "0.5rem" }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                paddingBottom: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="shimmer-bg" style={{ width: "70px", height: "11px", borderRadius: "2px" }} />
                <div className="shimmer-bg" style={{ width: "45px", height: "11px", borderRadius: "2px" }} />
              </div>
              <div className="shimmer-bg" style={{ width: "95%", height: "14px", borderRadius: "3px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
