/* eslint-disable */
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { VISIONOS_COLORS } from "@visionos/shared";

// Dynamically import heavy WebGL/ThreeJS components with SSR disabled to prevent Server-Side Render crashes
const StadiumDigitalTwin = dynamic(
  () => import("../components/cop/StadiumDigitalTwin"),
  { ssr: false }
);

const CanvasParticles = dynamic(
  () => import("../components/cop/CanvasParticles"),
  { ssr: false }
);

const CommandCenterSkeleton = dynamic(
  () => import("../components/cop/CommandCenterSkeleton"),
  { ssr: false }
);

export default function VisionOSLandingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [bootState, setBootState] = useState<"loading" | "ready" | "booted">("loading");
  const [bootText, setBootText] = useState("Initializing VisionOS Kernel...");
  const [activeSection, setActiveSection] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isExitTransition, setIsExitTransition] = useState(false);

  // Live telemetry metrics
  const [crowdCount, setCrowdCount] = useState(81250);
  const [temp, setTemp] = useState(24.5);
  const [waitTime, setWaitTime] = useState(12.5);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Slow scale zoom of the drone video (1.00 -> 1.08)
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.0, 1.08]);

  // Loading Sequence Boot Steps (Cinematic boot under 3 seconds)
  useEffect(() => {
    const steps = [
      { text: "Initializing VisionOS Kernel...", delay: 300 },
      { text: "System Booting: Loading Network Mesh...", delay: 600 },
      { text: "Initializing AI Agent Swarm (LangGraph)...", delay: 1000 },
      { text: "Mapping 3D Digital Twin Coordinates...", delay: 1400 },
      { text: "Establishing Secure Socket Connection...", delay: 1800 },
      { text: "VisionOS Smart Stadium Platform Ready.", delay: 2200 },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setBootText(step.text);
        if (index === steps.length - 1) {
          setTimeout(() => {
            setBootState("ready");
          }, 200);
        }
      }, step.delay);
    });
  }, []);

  // Update live metrics to make interface feel active
  useEffect(() => {
    if (bootState !== "booted") return;
    const interval = setInterval(() => {
      setCrowdCount(prev => prev + Math.floor(Math.random() * 7) - 3);
      setTemp(prev => Number((prev + (Math.random() * 0.16 - 0.08)).toFixed(1)));
      setWaitTime(prev => Number(Math.max(2, prev + (Math.random() * 0.3 - 0.15)).toFixed(1)));
    }, 1500);
    return () => clearInterval(interval);
  }, [bootState]);

  // Mouse move handler for spotlight cursor effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Track active section from scrollProgress (0 to 9)
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const idx = Math.min(9, Math.floor(latest * 10));
      setActiveSection(idx);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Command Operations console transition
  const handleBootConsole = () => {
    setIsExitTransition(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 700);
  };

  // Section configuration mappings for scroll positions
  const getSectionTransforms = (index: number) => {
    const center = index / 9.0;
    const buffer = 0.07; // transition width window

    // Clamped opacity curve
    const opacity = useTransform(
      scrollYProgress,
      [center - buffer, center - 0.02, center + 0.02, center + buffer],
      [0, 1, 1, 0]
    );

    // Continuous y translation curves (sliding in and morphing outwards)
    const y = useTransform(
      scrollYProgress,
      [center - buffer, center, center + buffer],
      [45, 0, -45]
    );

    // Scaling perspective depth mapping
    const scale = useTransform(
      scrollYProgress,
      [center - buffer, center, center + buffer],
      [0.96, 1, 1.04]
    );

    // Dynamic depth blur mapping
    const blur = useTransform(
      scrollYProgress,
      [center - buffer, center, center + buffer],
      ["blur(10px)", "blur(0px)", "blur(10px)"]
    );

    return { opacity, y, scale, filter: blur };
  };

  // Spring movement settings matching Linear style
  const springSettings = {
    type: "spring",
    damping: 26,
    stiffness: 85,
    mass: 0.9,
  };
  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        minHeight: "1000vh", // 10 virtual sections
        backgroundColor: "#0A0E1A",
        color: VISIONOS_COLORS.TEXT_PRIMARY,
        fontFamily: "'Inter', sans-serif",
        overflowX: "hidden",
        filter: isExitTransition ? "blur(15px) scale(0.95)" : "none",
        opacity: isExitTransition ? 0 : 1,
        transition: "filter 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      {/* Cinematic Loader Overlay */}
      <AnimatePresence>
        {(bootState === "loading" || bootState === "ready") && (
          <motion.div 
            key="loading-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "#0A0E1A",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Inter', sans-serif",
              color: VISIONOS_COLORS.TEXT_PRIMARY,
              zIndex: 9999,
              overflow: "hidden"
            }}
          >
            {/* Shimmering Skeleton Command Center Background */}
            <CommandCenterSkeleton />

            {/* Focused early loader window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ 
                textAlign: "center",
                zIndex: 10,
                backgroundColor: "rgba(10, 14, 26, 0.85)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "3rem",
                borderRadius: "32px",
                boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
                maxWidth: "520px",
                width: "90%"
              }}
            >
              <div style={{ fontSize: "3.2rem", fontWeight: "900", color: VISIONOS_COLORS.LPU_GOLD, letterSpacing: "3px", marginBottom: "0.5rem" }}>
                VisionOS
              </div>
              <div style={{ fontSize: "0.85rem", color: "#9ca3af", letterSpacing: "5px", textTransform: "uppercase", marginBottom: "2.5rem", fontWeight: "600" }}>
                FIFA World Cup Smart Stadium AI OS
              </div>

              <div style={{ width: "320px", height: "3px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "2px", margin: "0 auto 1.8rem auto", overflow: "hidden", position: "relative" }}>
                <motion.div
                  style={{ height: "100%", backgroundColor: VISIONOS_COLORS.LPU_GOLD, width: "100%", originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 2.0, ease: "easeInOut" }}
                />
              </div>

              <div style={{ fontSize: "0.9rem", color: "#9ca3af", fontStyle: "italic", height: "20px", letterSpacing: "0.5px" }}>
                {bootText}
              </div>

              {bootState === "ready" && (
                <motion.button
                  style={{
                    marginTop: "2.8rem",
                    padding: "0.9rem 2.8rem",
                    backgroundColor: "transparent",
                    border: `2px solid ${VISIONOS_COLORS.LPU_GOLD}`,
                    color: VISIONOS_COLORS.LPU_GOLD,
                    borderRadius: "30px",
                    cursor: "pointer",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    boxShadow: `0 0 15px rgba(212, 175, 55, 0.2)`
                  }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.04, boxShadow: `0 0 25px ${VISIONOS_COLORS.LPU_GOLD}`, backgroundColor: "rgba(212, 175, 55, 0.05)" }}
                  whileTap={{ scale: 0.96, boxShadow: `0 0 35px ${VISIONOS_COLORS.LPU_GOLD}`, borderColor: "#ffffff" }}
                  onClick={() => setBootState("booted")}
                >
                  Enter Command Operations Console
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* CINEMATIC LAYERED GPU BACKGROUND SYSTEM */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {/* Layer 1: Animated fluid mesh gradient */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }} className="animated-mesh" />

        {/* Layer 2: 4K Stadium Drone Video Backdrop */}
        <motion.video
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.32,
            scale: videoScale
          }}
          src="https://player.vimeo.com/external/494252666.hd.mp4?s=62531e21ab17015db7f56df7a079949673907ff9&profile_id=170&oauth2_token_id=57447761"
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Subtle Stadium Vignette Gradients */}
        <div 
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(10,14,26,0.2) 0%, rgba(10,14,26,0.7) 50%, #0A0E1A 100%)",
            zIndex: 1
          }}
        />

        {/* Layer 3: Dynamic Particle Grid System */}
        <CanvasParticles />

        {/* Layer 4: 3D Digital Twin rotating stadium mesh */}
        <StadiumDigitalTwin progress={activeSection / 9.0} />

        {/* Layer 5: Cursor Interactive Spotlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 255, 204, 0.05), transparent 80%)`
          }}
        />
      </div>

      {/* FIXED PLATFORM BRAND BAR */}
      <header
        style={{
          position: "fixed",
          top: "1.5rem",
          left: "2rem",
          right: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 50,
          pointerEvents: "auto"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: VISIONOS_COLORS.LPU_GOLD, boxShadow: `0 0 8px ${VISIONOS_COLORS.LPU_GOLD}` }} />
          <span style={{ fontSize: "1.1rem", fontWeight: "900", letterSpacing: "1.5px" }}>VISIONOS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", letterSpacing: "2px", fontWeight: "700" }}>FIFA WORLD CUP Smart Stadium OS</div>
          <button
            onClick={handleBootConsole}
            style={{
              padding: "0.55rem 1.4rem",
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: VISIONOS_COLORS.TEXT_PRIMARY,
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: "700",
              letterSpacing: "0.5px",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            className="hover:border-[#00ffcc] hover:bg-[rgba(0,255,204,0.05)] active:border-[#00ffcc] active:shadow-[0_0_12px_rgba(0,255,204,0.4)]"
          >
            Access COP Dashboard
          </button>
        </div>
      </header>

      {/* CONTINUOUS CINEMATIC SCROLL STORY CONTAINER */}
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ width: "100%", maxWidth: "1200px", padding: "0 2rem", position: "relative", pointerEvents: "auto" }}>
          
          {/* Section 1: Hero */}
          <motion.div
            style={{ ...getSectionTransforms(0), position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto max-w-[800px]">
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1.2rem", backgroundColor: "rgba(212,175,55,0.12)", border: `1px solid ${VISIONOS_COLORS.LPU_GOLD}`, borderRadius: "20px", marginBottom: "1.5rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: VISIONOS_COLORS.NORMAL_GREEN }} />
                <span style={{ fontSize: "0.75rem", fontWeight: "800", letterSpacing: "1.5px", color: VISIONOS_COLORS.LPU_GOLD }}>FIFA SMART STADIUM PLATFORM</span>
              </div>
              <h1 style={{ fontSize: "4.8rem", fontWeight: "900", letterSpacing: "-2px", margin: "0 0 1.2rem 0", lineHeight: 1.05 }}>
                Command the Stadium. Automate the Intelligence.
              </h1>
              <p style={{ fontSize: "1.25rem", color: "#9ca3af", margin: "0 0 2rem 0", lineHeight: 1.6 }}>
                An advanced multi-agent operating system orchestrating real-time crowd dynamics, safety dispatching, and automated green sustainability.
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                <MagneticButton onClick={handleBootConsole} primary>
                  Boot Command Center
                </MagneticButton>
                <MagneticButton 
                  onClick={() => {
                    window.scrollTo({ top: window.innerHeight * 1.1, behavior: "smooth" });
                  }}
                >
                  Begin Tactical Briefing
                </MagneticButton>
              </div>
            </div>
          </motion.div>

          {/* Section 2: Live Stadium Metrics */}
          <motion.div
            style={{ ...getSectionTransforms(1), position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto">
              <h2 style={{ fontSize: "3rem", fontWeight: "900", color: VISIONOS_COLORS.LPU_GOLD, marginBottom: "1.2rem" }}>
                Live Stadium Operations
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                Continuous data synchronization with edge computer vision cameras, ticketing entry systems, and meteorological forecasts.
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ width: "4px", backgroundColor: VISIONOS_COLORS.LPU_GOLD }} />
                <span style={{ fontSize: "0.95rem", color: "#9ca3af", fontStyle: "italic" }}>
                  "Platform operations monitor queue flow times and safety telemetry at 1 Hz resolution."
                </span>
              </div>
            </div>

            <div className="pointer-events-auto grid grid-cols-2 gap-6">
              <MetricCard title="CROWD CAPACITY" value={`${crowdCount.toLocaleString()} / 85,000`} color="#00ffcc" />
              <MetricCard title="METEO PROFILE" value={`${temp}°C • Humidity 64%`} color="#00ffcc" />
              <MetricCard title="AVG QUEUE TIME" value={`${waitTime} mins`} color="#d4af37" />
              <MetricCard title="SAFETY DISPATCH" value="1,200 Stewards Active" color="#00ffcc" />
            </div>
          </motion.div>

          {/* Section 3: AI Intelligence Swarm */}
          <motion.div
            style={{ ...getSectionTransforms(2), position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto max-w-[900px] mx-auto">
              <h2 style={{ fontSize: "3rem", fontWeight: "900", marginBottom: "1.2rem" }}>
                LangGraph Autonomous Swarm
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.15rem", marginBottom: "3rem", lineHeight: 1.6 }}>
                Instead of static scripts, VisionOS coordinates specialized AI agents (CrowdAgent, SustainabilityAgent, NavigationAgent) that collaborate to evaluate concerns and trigger resolutions.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", gap: "1rem" }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "2px", backgroundColor: "rgba(255,255,255,0.06)", zIndex: 0 }} />
                <SwarmStep active={activeSection >= 2} index="01" label="Analyzing Stadium" />
                <SwarmStep active={activeSection >= 2} index="02" label="Reading Crowd" />
                <SwarmStep active={activeSection >= 2} index="03" label="Traffic Prediction" />
                <SwarmStep active={activeSection >= 2} index="04" label="Volunteer Allocation" />
                <SwarmStep active={activeSection >= 2} index="05" label="Safety Check" />
                <SwarmStep active={activeSection >= 2} index="06" label="Decision Ready" />
              </div>
            </div>
          </motion.div>

          {/* Section 4: Crowd Analytics Chart */}
          <motion.div
            style={{ ...getSectionTransforms(3), position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto">
              <h2 style={{ fontSize: "3.2rem", fontWeight: "900", color: VISIONOS_COLORS.LPU_GOLD, marginBottom: "1.2rem" }}>
                Crowd Analytics
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                Real-time density graphs draw themselves as flow models compute. Predict congestion issues up to 15 minutes before bottlenecks occur.
              </p>
              <div style={{ display: "flex", gap: "2.5rem" }}>
                <div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "800", color: VISIONOS_COLORS.NORMAL_GREEN }}>1.8 p/m²</div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Concourse Density Average</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "800", color: VISIONOS_COLORS.CRITICAL_RED }}>3.5 p/m²</div>
                  <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Critical Alert Threshold</div>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto glass-panel p-8">
              <h4 style={{ margin: "0 0 1.5rem 0", fontSize: "0.9rem", color: "#9ca3af", letterSpacing: "1px", fontWeight: "700" }}>CONCOURSE FLOW SPEED VS DENSITY</h4>
              <svg viewBox="0 0 400 200" style={{ width: "100%", height: "auto" }}>
                <line x1="20" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.05)" />
                <line x1="20" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.05)" />
                <line x1="20" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.05)" />
                <line x1="20" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.08)" />

                {/* Animated line chart drawing itself */}
                <motion.path
                  d="M 20 170 Q 100 130 180 80 T 300 40 T 380 30"
                  fill="none"
                  stroke={VISIONOS_COLORS.LPU_GOLD}
                  strokeWidth="3.5"
                  initial={{ pathLength: 0 }}
                  animate={activeSection >= 3 ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
                />
                
                <motion.path
                  d="M 20 170 Q 100 130 180 80 T 300 40 T 380 30 L 380 170 L 20 170 Z"
                  fill="url(#gold-gradient)"
                  initial={{ opacity: 0 }}
                  animate={activeSection >= 3 ? { opacity: 0.15 } : { opacity: 0 }}
                  transition={{ delay: 0.8, duration: 1 }}
                />

                <defs>
                  <linearGradient id="gold-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={VISIONOS_COLORS.LPU_GOLD} />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </motion.div>

          {/* Section 5: Volunteer Network */}
          <motion.div
            style={{ ...getSectionTransforms(4), position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "4rem", alignItems: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto glass-panel p-6 min-h-[350px] relative overflow-hidden">
              <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <h4 style={{ position: "relative", margin: "0 0 1rem 0", color: "#9ca3af", fontSize: "0.85rem", letterSpacing: "1px", fontWeight: "700" }}>DISPATCHING ACTIVE FIELD PROTOCOLS</h4>

              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <motion.path
                  d="M 80 200 L 240 100 L 420 280"
                  stroke="#00ffcc"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={activeSection >= 4 ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </svg>

              <MapNode top="200px" left="80px" color="#00ffcc" label="STWD-09 (GATE B4)" />
              <MapNode top="100px" left="240px" color="#d4af37" label="CROWD OVERCROWD ALERT" />
              <MapNode top="280px" left="420px" color="#00ffcc" label="STWD-42 (EN ROUTE)" />
            </div>

            <div className="pointer-events-auto">
              <h2 style={{ fontSize: "3rem", fontWeight: "900", marginBottom: "1.2rem" }}>
                Volunteer Network
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                Instantly dispatch nearby volunteer stewards based on smart indoor location sensors and task urgency levels.
              </p>
              <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", padding: "0.5rem 1.2rem", backgroundColor: "rgba(0, 255, 204, 0.08)", border: "1px solid #00ffcc", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "#00ffcc", fontWeight: "bold" }}>
                  ⚡ 18.5s Average Dispatch Response Time
                </span>
              </div>
            </div>
          </motion.div>

          {/* Section 6: Accessibility */}
          <motion.div
            style={{ ...getSectionTransforms(5), position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto">
              <h2 style={{ fontSize: "3rem", fontWeight: "900", color: VISIONOS_COLORS.LPU_GOLD, marginBottom: "1.2rem" }}>
                Inclusivity & Accessibility
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                Fully WCAG 2.2 AAA compliant contrast values and step-free directions mapping, ensuring all fans experience the tournament comfortably.
              </p>
              <ul style={{ paddingLeft: "1.2rem", color: "#9ca3af", lineHeight: "1.8rem" }}>
                <li>High Contrast color tokens for all queue status interfaces</li>
                <li>Live ADA step-free wheelchair routing overlays</li>
                <li>Audio navigation dispatches for visually impaired visitors</li>
              </ul>
            </div>

            <div className="pointer-events-auto glass-panel p-8">
              <h4 style={{ margin: "0 0 1.5rem 0", color: "#9ca3af", fontSize: "0.9rem", letterSpacing: "1px", fontWeight: "700" }}>WCAG AAA TOKEN CONTRAST RATIO</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 1.2rem", backgroundColor: "rgba(0, 255, 204, 0.05)", borderRadius: "8px" }}>
                  <span>Contrast Ratio: Background vs Text</span>
                  <span style={{ fontWeight: "bold", color: "#00ffcc" }}>7.2 : 1 (PASS AAA)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 1.2rem", backgroundColor: "rgba(212, 175, 55, 0.05)", borderRadius: "8px" }}>
                  <span>Gold Accent Contrast</span>
                  <span style={{ fontWeight: "bold", color: VISIONOS_COLORS.LPU_GOLD }}>5.1 : 1 (PASS AAA)</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 7: Emergency Evac lockout */}
          <motion.div
            style={{ ...getSectionTransforms(6), position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto max-w-[900px] mx-auto p-12 bg-[rgba(255,30,30,0.06)] border-2 border-[#FF1E1E] rounded-[32px] relative overflow-hidden">
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", backgroundColor: "#FF1E1E" }} />
              <h2 style={{ fontSize: "3.2rem", fontWeight: "900", color: "#FF1E1E", marginBottom: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.8rem" }}>
                🚨 Emergency Lockout & Evac
              </h2>
              <p style={{ color: "#fca5a5", fontSize: "1.15rem", marginBottom: "2rem", lineHeight: 1.6 }}>
                When a critical concourse capacity surge is detected, VisionOS triggers the Level 2 Emergency Lockout banner, rerouting visitors automatically.
              </p>
              <div style={{ display: "inline-flex", padding: "0.9rem 2.2rem", backgroundColor: "#FF1E1E", color: "#ffffff", borderRadius: "30px", fontWeight: "800", letterSpacing: "0.5px" }}>
                EVAC DIRECTIVE ACTIVE: ROUTE VIA ADA STEP-FREE CORRIDOR
              </div>
            </div>
          </motion.div>

          {/* Section 8: HVAC Sustainability */}
          <motion.div
            style={{ ...getSectionTransforms(7), position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto">
              <h2 style={{ fontSize: "3rem", fontWeight: "900", color: VISIONOS_COLORS.LPU_GOLD, marginBottom: "1.2rem" }}>
                HVAC & Energy Sustainability
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                Integrates directly with BACnet units. Throttles ventilation systems (CFM) to 50% automatically when empty sectors are identified.
              </p>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <div style={{ padding: "1.2rem", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", flex: 1 }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#00ffcc" }}>-38% kW</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>HVAC energy reduction</div>
                </div>
                <div style={{ padding: "1.2rem", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", flex: 1 }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#00ffcc" }}>100% CFM</div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Emergency Purge Response Rate</div>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto glass-panel p-8">
              <h4 style={{ margin: "0 0 1.5rem 0", color: "#9ca3af", fontSize: "0.9rem", letterSpacing: "1px", fontWeight: "700" }}>ENERGY CONSUMPTION PROFILE</h4>
              <div style={{ display: "flex", alignItems: "flex-end", height: "130px", gap: "1.2rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <motion.div style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.08)" }} initial={{ height: 0 }} animate={activeSection >= 7 ? { height: "100px" } : { height: 0 }} transition={{ duration: 1.2 }} />
                <motion.div style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.08)" }} initial={{ height: 0 }} animate={activeSection >= 7 ? { height: "85px" } : { height: 0 }} transition={{ duration: 1.2 }} />
                <motion.div style={{ width: "100%", backgroundColor: VISIONOS_COLORS.LPU_GOLD }} initial={{ height: 0 }} animate={activeSection >= 7 ? { height: "45px" } : { height: 0 }} transition={{ duration: 1.2 }} />
                <motion.div style={{ width: "100%", backgroundColor: "#00ffcc" }} initial={{ height: 0 }} animate={activeSection >= 7 ? { height: "35px" } : { height: 0 }} transition={{ duration: 1.2 }} />
              </div>
            </div>
          </motion.div>

          {/* Section 9: Digital Twin */}
          <motion.div
            style={{ ...getSectionTransforms(8), position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "4rem", alignItems: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto">
              <h2 style={{ fontSize: "3rem", fontWeight: "900", marginBottom: "1.2rem" }}>
                3D Digital Twin Integration
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                WebGL-based 3D digital rendering of concourse sectors, providing coordinators an instantaneous spatial visualization of capacity and hazard triggers.
              </p>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#00ffcc", boxShadow: "0 0 10px #00ffcc" }} />
                <span style={{ fontSize: "0.9rem", color: "#9ca3af", fontWeight: "600" }}>WebGL 60 FPS Digital Twin Rendering Active</span>
              </div>
            </div>

            <div className="pointer-events-auto glass-panel p-8 h-[320px] relative overflow-hidden flex flex-col justify-end">
              <div style={{ position: "absolute", top: "1.5rem", left: "1.5rem", zIndex: 5 }}>
                <div style={{ fontSize: "0.75rem", color: VISIONOS_COLORS.LPU_GOLD, fontWeight: "800", letterSpacing: "1px" }}>ROTATION MODEL</div>
                <div style={{ fontSize: "1rem", color: "#ffffff", fontWeight: "700" }}>STADIUM BOWL COORDINATES</div>
              </div>
              <div style={{ height: "140px", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
                3D Spatial View Active
              </div>
            </div>
          </motion.div>

          {/* Section 10: Call to Action */}
          <motion.div
            style={{ ...getSectionTransforms(9), position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
            className="pointer-events-none"
          >
            <div className="pointer-events-auto max-w-[800px]">
              <h2 style={{ fontSize: "4.2rem", fontWeight: "900", letterSpacing: "-1px", marginBottom: "1.5rem", lineHeight: 1.1 }}>
                Secure the Match-Day.
              </h2>
              <p style={{ color: "#9ca3af", fontSize: "1.25rem", lineHeight: 1.7, marginBottom: "2.5rem" }}>
                Enter the command operations environment to monitor dispatches, configure BACnet thresholds, and trigger automated emergency evacuations.
              </p>
              <motion.button
                onClick={handleBootConsole}
                style={{
                  padding: "1.25rem 3.5rem",
                  backgroundColor: "transparent",
                  border: `2px solid ${VISIONOS_COLORS.LPU_GOLD}`,
                  color: VISIONOS_COLORS.LPU_GOLD,
                  borderRadius: "40px",
                  fontWeight: "900",
                  fontSize: "1.1rem",
                  letterSpacing: "1.5px",
                  cursor: "pointer",
                  boxShadow: `0 0 20px rgba(212, 175, 55, 0.2)`,
                  textTransform: "uppercase"
                }}
                whileHover={{ scale: 1.05, boxShadow: `0 0 35px ${VISIONOS_COLORS.LPU_GOLD}`, backgroundColor: "rgba(212, 175, 55, 0.06)" }}
                whileTap={{ scale: 0.96, boxShadow: `0 0 45px ${VISIONOS_COLORS.LPU_GOLD}`, borderColor: "#ffffff" }}
              >
                Access Command Console (COP)
              </motion.button>
            </div>
          </motion.div>

        </div>
      </div>

      {/* FIXED SCROLL DOT INDICATORS */}
      <div
        style={{
          position: "fixed",
          right: "3rem",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
          zIndex: 40
        }}
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight * index + (index > 0 ? 50 : 0),
                behavior: "smooth"
              });
            }}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: activeSection === index ? VISIONOS_COLORS.LPU_GOLD : "rgba(255,255,255,0.18)",
              border: activeSection === index ? `2px solid ${VISIONOS_COLORS.TEXT_PRIMARY}` : "none",
              cursor: "pointer",
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            title={`Section ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// Magnetic Button component implementing premium keynotes micro-interactions
function MagneticButton({ children, onClick, primary }: { children: any; onClick: () => void; primary?: boolean }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setOffset({ x: x * 0.22, y: y * 0.22 }); // magnetic pull coefficient
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      style={{
        padding: "1rem 2.4rem",
        backgroundColor: primary ? VISIONOS_COLORS.LPU_GOLD : "rgba(255, 255, 255, 0.04)",
        color: primary ? "#000000" : VISIONOS_COLORS.TEXT_PRIMARY,
        border: primary ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "30px",
        fontWeight: "700",
        cursor: "pointer",
        fontSize: "0.95rem",
        boxShadow: primary ? `0 8px 24px rgba(212, 175, 55, 0.25)` : "none",
        transition: "border-color 0.2s"
      }}
      whileHover={primary ? { scale: 1.04, boxShadow: `0 8px 32px ${VISIONOS_COLORS.LPU_GOLD}` } : { scale: 1.04, borderColor: "#00ffcc" }}
      whileTap={primary ? { scale: 0.96, boxShadow: `0 4px 15px ${VISIONOS_COLORS.LPU_GOLD}` } : { scale: 0.96, borderColor: "#00ffcc", boxShadow: "0 0 15px rgba(0, 255, 204, 0.4)" }}
    >
      {children}
    </motion.button>
  );
}

// Reusable Metric Card with mouse-tilt micro-interaction
function MetricCard({ title, value, color }: { title: string; value: string; color: string }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -2; // max tilt 2 degrees
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * 2;
    setTilt({ rx, ry });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: tilt.rx, rotateY: tilt.ry }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      style={{
        background: "rgba(10, 14, 26, 0.7)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "24px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backdropFilter: "blur(14px)",
        boxShadow: "0 8px 32px 0 rgba(0,0,0,0.3)"
      }}
    >
      <span style={{ fontSize: "0.75rem", color: "#9ca3af", letterSpacing: "1.2px", fontWeight: "700" }}>{title}</span>
      <span style={{ fontSize: "1.3rem", fontWeight: "900", color: color, marginTop: "0.8rem" }}>{value}</span>
    </motion.div>
  );
}

// Reusable Swarm Stage Step
function SwarmStep({ active, index, label }: { active: boolean; index: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, flex: 1 }}>
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          backgroundColor: active ? "#00ffcc" : "rgba(255,255,255,0.05)",
          color: active ? "#000000" : "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "0.85rem",
          boxShadow: active ? "0 0 15px #00ffcc" : "none",
          border: `2px solid ${active ? "#00ffcc" : "rgba(255,255,255,0.1)"}`
        }}
      >
        {index}
      </div>
      <span style={{ fontSize: "0.8rem", color: active ? "#ffffff" : "#9ca3af", marginTop: "0.8rem", fontWeight: "700" }}>{label}</span>
    </div>
  );
}

// Reusable Map Node steward indicator
function MapNode({ top, left, color, label }: { top: string; left: string; color: string; label: string }) {
  return (
    <div style={{ position: "absolute", top: top, left: left, display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ position: "relative", display: "flex", height: "10px", width: "10px" }}>
        <span style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", position: "absolute", width: "100%", height: "100%", borderRadius: "50%", backgroundColor: color, opacity: 0.75 }} className="animate-ping" />
        <span style={{ position: "relative", borderRadius: "50%", height: "10px", width: "10px", backgroundColor: color }} />
      </span>
      <span style={{ fontSize: "0.72rem", color: "#ffffff", backgroundColor: "rgba(10,14,26,0.9)", padding: "0.25rem 0.65rem", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.18)", fontWeight: "600" }}>
        {label}
      </span>
    </div>
  );
}
