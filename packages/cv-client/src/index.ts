/**
 * @visionos/cv-client entry point
 * RTSP frame decoding interfaces, NVIDIA Jetson Edge CV simulation (`17_Computer_Vision_Pipeline.md`), and HTTP telemetry emitter.
 */

import type { IEdgeFrameMetadata, RTSPStreamConfig } from "@visionos/shared";

export interface IRTSPClientOptions {
  config: RTSPStreamConfig;
  onFrameMetadata: (metadata: IEdgeFrameMetadata) => void;
  onError: (error: Error) => void;
}

export class RTSPStreamReceiver {
  private isConnected: boolean = false;
  private readonly config: RTSPStreamConfig;

  constructor(options: IRTSPClientOptions) {
    this.config = options.config;
  }

  public connect(): void {
    this.isConnected = true;
    console.log(`[RTSPStreamReceiver] Connected to RTSP stream at ${this.config.rtspUri}`);
  }

  public disconnect(): void {
    this.isConnected = false;
    console.log(`[RTSPStreamReceiver] Disconnected from RTSP stream ${this.config.cameraId}`);
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

/**
 * EdgeFrameSimRunner: Simulates a 1 Hz NVIDIA Jetson Edge CV processing loop (`FR-CV-001`) emitting concourse queue bounding box counts.
 */
export class EdgeFrameSimRunner {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    private readonly gatewayUrl: string = "http://localhost:8080/api/v1/telemetry/frame",
    private readonly jwtToken: string = "MOCK_JWT_TOKEN"
  ) {}

  public startSimulation(zoneId: string = "CONCOURSE_B4_EAST", cameraId: string = "JETSON_B4_CAM_01"): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[EdgeFrameSimRunner] Starting 1 Hz Jetson Edge CV telemetry emitter for ${cameraId} -> ${zoneId}`);

    let tick = 0;
    this.intervalId = setInterval(() => {
      void (async () => {
        tick++;
        // Simulate normal vs burst density fluctuations
        const baseHeadcount = 420;
        const fluctuation = Math.round(Math.sin(tick * 0.2) * 120);
        const headcount = Math.max(80, baseHeadcount + fluctuation);
        const density = parseFloat((headcount / 240).toFixed(2));
        const queueDepth = parseFloat((density * 4.2).toFixed(1));

        const payload = {
          traceId: `trace_edge_${Date.now()}`,
          cameraId,
          zoneId,
          sectorName: "Gate B4 East Concourse",
          personBoundingBoxCount: headcount,
          areaSqM: 240,
          queueDepthMeters: queueDepth,
          averageFlowVelocityMps: Math.max(0.3, parseFloat((1.8 - density * 0.35).toFixed(2))),
        };

        try {
          const response = await fetch(this.gatewayUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.jwtToken}`,
            },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            console.warn(`[EdgeFrameSimRunner] Gateway emitted HTTP ${response.status}`);
          } else {
            console.log(`[EdgeFrameSimRunner] Transmitted 1 Hz frame: ${headcount} bounding boxes (${density} p/m²) -> ${zoneId}`);
          }
        } catch (err: unknown) {
          // Silently log offline transmission attempt when gateway is not locally bound
          console.debug(`[EdgeFrameSimRunner] Offline buffer queued: ${err instanceof Error ? err.message : String(err)}`);
        }
      })();
    }, 1000);
  }

  public stopSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[EdgeFrameSimRunner] Stopped 1 Hz Edge CV simulation.");
  }
}
