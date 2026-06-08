import { isMongoConfigured, isMongoConnected } from "../database/connection";

export interface HealthCheckResult {
  status: "ok";
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  services: {
    http: "up";
    mongodb: "connected" | "not_configured" | "disconnected";
  };
}

export function buildHealthPayload(): HealthCheckResult {
  let mongodb: HealthCheckResult["services"]["mongodb"] = "not_configured";

  if (isMongoConfigured()) {
    mongodb = isMongoConnected() ? "connected" : "disconnected";
  }

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? "development",
    version: process.env.npm_package_version ?? "unknown",
    services: {
      http: "up",
      mongodb
    }
  };
}
