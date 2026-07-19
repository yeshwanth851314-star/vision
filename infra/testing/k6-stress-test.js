/**
 * @visionos/infra/testing/k6-stress-test.js
 * High-Concurrency Real-Time WebSocket & HTTP Stress Test (`VIS-702`, `23_Testing_Strategy.md`).
 * Simulates 120,000 Virtual Users (VUs) ingesting 1 Hz telemetry and receiving real-time emergency broadcasts.
 * Target SLA: P95 handshake & push latency < 50ms, 0% pod crashes.
 */

import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

export const wsHandshakeLatency = new Trend("ws_handshake_latency_ms");
export const wsMessageLatency = new Trend("ws_message_latency_ms");
export const errorRate = new Rate("error_rate");
export const telemetryPacketsSent = new Counter("telemetry_packets_sent");

export const options = {
  stages: [
    { duration: "30s", target: 5000 },   // Warm-up phase
    { duration: "2m", target: 50000 },   // Ramp to 50k VUs
    { duration: "3m", target: 120000 },  // Peak surge testing (120,000 VUs)
    { duration: "1m", target: 0 },       // Cool-down & graceful disconnect
  ],
  thresholds: {
    ws_handshake_latency_ms: ["p(95)<50"], // P95 handshake SLA < 50ms
    ws_message_latency_ms: ["p(99)<45"],   // P99 emergency broadcast SLA < 45ms
    error_rate: ["rate<0.001"],            // Error rate < 0.1%
  },
};

const GATEWAY_HTTP_URL = __ENV.GATEWAY_URL || "http://localhost:8080";
const GATEWAY_WS_URL = __ENV.WS_URL || "ws://localhost:8080/socket.io/?EIO=4&transport=websocket";

export default function () {
  const isVolunteerOrStaff = __VU % 10 === 0; // 10% VUs are command/volunteers emitting telemetry

  if (isVolunteerOrStaff) {
    // 1. Emulate 1 Hz Edge CV / Turnstile HTTP Ingestion
    const payload = JSON.stringify({
      traceId: `trace_k6_${Date.now()}_${__VU}`,
      cameraId: `JETSON_CAM_${__VU % 100}`,
      zoneId: __VU % 2 === 0 ? "CONCOURSE_B4_EAST" : "CONCOURSE_B4_WEST",
      sectorName: "Gate B4 Ring 1",
      personBoundingBoxCount: 420 + (__VU % 150),
      areaSqM: 240,
      queueDepthMeters: 4.1,
      averageFlowVelocityMps: 1.1,
    });

    const headers = { "Content-Type": "application/json", Authorization: "Bearer MOCK_JWT_TOKEN" };
    const res = http.post(`${GATEWAY_HTTP_URL}/api/v1/telemetry/frame`, payload, { headers });

    check(res, {
      "HTTP 200 Telemetry Ingestion": (r) => r.status === 200,
      "Response Time < 30ms": (r) => r.timings.duration < 30,
    }) || errorRate.add(1);

    telemetryPacketsSent.add(1);
    sleep(1.0); // 1 Hz emission rate
  } else {
    // 2. Emulate Fan Mobile App listening to real-time Socket.io mesh
    const startTime = Date.now();
    const res = ws.connect(GATEWAY_WS_URL, null, function (socket) {
      socket.on("open", function () {
        wsHandshakeLatency.add(Date.now() - startTime);
        // Subscribe to sector room
        socket.send('42["subscribe",{"room":"stadium:zone:CONCOURSE_B4_EAST"}]');
      });

      socket.on("message", function (msg) {
        if (msg.startsWith('42["alert:critical_surge"')) {
          wsMessageLatency.add(Date.now() - startTime);
        }
      });

      socket.on("error", function (e) {
        errorRate.add(1);
      });

      // Stay connected for 15 seconds receiving real-time concourse updates
      sleep(15);
      socket.close();
    });

    check(res, { "WebSocket connected successfully": (r) => r && r.status === 101 }) || errorRate.add(1);
  }
}
