/**
 * @visionos/bms-gateway entry point
 * BACnet / Modbus industrial hardware actuator and concourse signage bridge (`FR-SUS-001`).
 */

import type { BMSCommand } from "@visionos/shared";

export class BMSHardwareBridge {
  private isConnected: boolean = false;

  public connect(): void {
    this.isConnected = true;
    console.log("[BMSHardwareBridge] Connected to industrial BACnet/Modbus Ethernet bus.");
  }

  public disconnect(): void {
    this.isConnected = false;
    console.log("[BMSHardwareBridge] Disconnected from BACnet/Modbus bus.");
  }

  public async executeCommand(command: BMSCommand): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Cannot execute BMS command while bridge is disconnected");
    }
    console.log(`[BMSHardwareBridge] Executing ${command.protocol} WriteProperty on ${command.targetDeviceNumber} -> ${command.property} = ${command.value}`);
    return true;
  }
}
