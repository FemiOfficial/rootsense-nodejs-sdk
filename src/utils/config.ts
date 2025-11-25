import { RootSenseConfig } from "../types";

const DEFAULT_CONFIG: Required<
  Omit<RootSenseConfig, "apiKey" | "apiUrl" | "websocketUrl" | "projectId">
> = {
  serviceName: "unknown-service",
  environment: "production",
  version: "1.0.0",
  maxBufferSize: 1000,
  flushInterval: 5000, // 5 seconds
  batchSize: 100,
  enableWebSocket: false,
  enableMetrics: true,
  enableErrorTracking: true,
  enableAutoInstrumentation: true,
  sanitizePII: true,
  piiFields: [
    "password",
    "token",
    "authorization",
    "apiKey",
    "secret",
    "ssn",
    "creditCard",
    "email",
  ],
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 10000,
  tags: {},
};

export function normalizeConfig(
  config: RootSenseConfig
): Required<RootSenseConfig> {
  const apiKey = config.apiKey || process.env.ROOTSENSE_API_KEY || "";
  const apiUrl =
    config.apiUrl ||
    process.env.ROOTSENSE_API_URL ||
    "https://api.rootsense.ai";
  const projectId = config.projectId || process.env.ROOTSENSE_PROJECT_ID || "";

  if (!apiKey) {
    throw new Error(
      "API key is required. Provide apiKey in config or set ROOTSENSE_API_KEY environment variable."
    );
  }

  if (!projectId) {
    throw new Error(
      "Project ID is required. Provide projectId in config or set ROOTSENSE_PROJECT_ID environment variable."
    );
  }

  return {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey,
    apiUrl,
    projectId,
    websocketUrl: config.websocketUrl || apiUrl.replace(/^https?/, "ws"),
    serviceName: config.serviceName || DEFAULT_CONFIG.serviceName,
  };
}
