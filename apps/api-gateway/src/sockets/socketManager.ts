/**
 * @visionos/api-gateway/sockets/socketManager.ts
 * Socket.io v4 room managers and JWT handshake verification (`20_WebSocket_Flow.md`).
 */

import type { Socket } from "socket.io";
import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import type { ZoneTelemetryDTO, CrowdAlertPayload } from "@visionos/shared";
import { verifyVisionToken } from "../middleware/auth";

export class SocketManager {
  private static instance: SocketManager | null = null;
  private io: SocketServer;

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      path: "/api/v1/realtime/mesh",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    SocketManager.instance = this;
    this.setupAuthMiddleware();
    this.setupConnectionHandlers();
  }

  public static emitToRoom(room: string, event: string, payload: any): void {
    if (SocketManager.instance) {
      SocketManager.instance.io.to(room).emit(event, payload);
    }
  }

  private setupAuthMiddleware(): void {
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!token) {
        return next(new Error("Authentication error: Missing token in Socket.io handshake"));
      }
      const claims = verifyVisionToken(String(token));
      if (!claims) return next(new Error("Authentication error: Invalid token"));
      socket.data.user = claims;
      next();
    });
  }

  private setupConnectionHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[SocketManager] Client connected: ${socket.id} (Role: ${socket.data.user.role})`);
      void socket.join("global:stadium");
      void socket.join(`role:${socket.data.user.role}`);
      void socket.join(`sector:${socket.data.user.sectorCode}`);

      socket.on("join:zone", (zoneId: string) => {
        void socket.join(`stadium:zone:${zoneId}`);
        console.log(`[SocketManager] Socket ${socket.id} joined room stadium:zone:${zoneId}`);
      });

      socket.on("join:alerts", () => {
        void socket.join("alerts:emergency");
        console.log(`[SocketManager] Socket ${socket.id} joined emergency alerts room`);
      });

      socket.on("disconnect", (reason) => {
        console.log(`[SocketManager] Client disconnected: ${socket.id} (${reason})`);
      });
    });
  }

  public broadcastZoneTelemetry(telemetry: ZoneTelemetryDTO): void {
    this.io.to(`stadium:zone:${telemetry.zoneId}`).emit("telemetry:update", telemetry);
  }

  public broadcastEmergencyOverride(alert: CrowdAlertPayload): void {
    this.io.to("alerts:emergency").emit("EMERGENCY_OVERRIDE", alert);
  }
}
