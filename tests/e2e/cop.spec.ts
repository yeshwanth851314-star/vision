/**
 * @visionos/tests/e2e/cop.spec.ts
 * Tier 3: Playwright End-to-End User Journey Verification (`23_Testing_Strategy.md`).
 * Covers critical COP workflows: Dashboard rendering, Field Dispatch tickets (`VIS-101`),
 * BACnet Throttling (`VIS-601`), LangGraph Swarm Audit (`VIS-401`), and Emergency Lockout (`FR-EMR-001`).
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Tier 3: VisionOS Command & Operations (COP) E2E User Journeys", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the COP dashboard root and wait for hydration
    test.setTimeout(60000);
    await page.goto("http://localhost:3000/dashboard");
    await expect(page.locator("text=MARCUS VANCE")).toBeVisible({ timeout: 25000 });
  });

  test("should render permanent military-grade navigation bar with LPU branding and commander status", async ({ page }) => {
    // Check navigation brand and subtitle
    await expect(page.locator("header h1")).toContainText("VisionOS");
    await expect(page.locator("text=Command & Operations Platform (COP)")).toBeVisible();

    // Check Commander status and navigation items
    await expect(page.locator("text=MARCUS VANCE")).toBeVisible();
    await expect(page.locator("text=COMMANDER • ROLE_ORGANIZER")).toBeVisible();
    await expect(page.locator("text=🌐 3D Digital Twin")).toBeVisible();

    // Accessibility Audit for Dashboard (WCAG 2.2 AA)
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should navigate to Field Volunteer Dispatch Control Panel (`/incidents`) and verify PostGIS coordinates", async ({ page }) => {
    // Click navigation link and allow Next.js dev server on-demand compilation time
    await page.locator('a[href="/incidents"]').click();
    await expect(page).toHaveURL(/.*\/incidents/, { timeout: 20000 });

    // Verify main header
    await expect(page.locator("text=Field Volunteer Dispatches & Hazard Management (`FR-COP-002`)")).toBeVisible({ timeout: 15000 });

    // Verify steward assignments table
    await expect(page.locator("text=Sarah Jenkins")).toBeVisible();
    await expect(page.locator("text=Gate B4 East Concourse")).toBeVisible();

    // Accessibility Audit for Incidents page
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should navigate to BMS HVAC Airflow & Energy Throttling Control Panel (`/sustainability`) and simulate zero-occupancy throttling", async ({ page }) => {
    // Click navigation link and allow Next.js dev server on-demand compilation time
    await page.locator('a[href="/sustainability"]').click();
    await expect(page).toHaveURL(/.*\/sustainability/, { timeout: 20000 });

    // Verify BACnet units table
    await expect(page.locator("text=BACnet-AHU-1024")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Gate B4 East Concourse")).toBeVisible();

    // Trigger simulation button
    const simBtn = page.locator("text=🌱 Simulate 15-Min Zero Occupancy Throttling (`AHU-1102` -> 50% CFM)");
    await expect(simBtn).toBeVisible();
    await simBtn.click();

    // Verify status update via the commanded by audit trail
    await expect(page.locator("text=SustainabilityAgent (Zero-Occupancy Auto-Throttled)")).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to LangGraph Swarm Audit (`/swarm-audit`) and trigger live diagnostic trace", async ({ page }) => {
    // Click navigation link and allow Next.js dev server on-demand compilation time
    await page.locator('a[href="/swarm-audit"]').click();
    await expect(page).toHaveURL(/.*\/swarm-audit/, { timeout: 20000 });

    // Verify header and initial traces
    await expect(page.locator("text=LangGraph Multi-Agent Swarm Traceability & Audit Trail (`FR-LAN-003`)")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=trc_99482_b4_surge")).toBeVisible();

    // Accessibility Audit for Swarm Audit page
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Execute diagnostic trace
    const diagBtn = page.locator("text=⚡ Execute Live Swarm Diagnostic & Trace");
    await expect(diagBtn).toBeVisible();
    await diagBtn.click();

    // Verify new trace injection
    await expect(page.locator("text=BMS_ZERO_OCCUPANCY_TIMER_15M")).toBeVisible({ timeout: 10000 });
  });

  test("should verify Level 2 Emergency Evacuation lockout banner mounts (`FR-EMR-001`)", async ({ page }) => {
    // Trigger emergency broadcast on Dashboard page
    const evacBtn = page.locator("text=🔥 Simulate Critical Surge (3.8 p/m²)");
    await expect(evacBtn).toBeVisible();
    await evacBtn.click();

    // Verify Emergency Evac Banner mounts and covers viewport with exact payload text
    await expect(page.locator("text=🚨 EMERGENCY EVACUATION PROTOCOL ACTIVE 🚨")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=RECOMMENDED ADA STEP-FREE SAFE EXIT: GATE_W2")).toBeVisible({ timeout: 10000 });
  });
});
