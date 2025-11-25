import { init } from "../src";

/**
 * Basic Usage Example with OpenTelemetry Auto-Instrumentation
 *
 * OpenTelemetry instrumentation is enabled by default when you initialize the SDK.
 * It automatically tracks:
 * - HTTP requests/responses
 * - Database queries (PostgreSQL, MySQL, MongoDB)
 * - Redis operations
 * - Fetch API calls
 * - Framework-specific operations (Express, Fastify, Koa, etc.)
 *
 * To use auto-instrumentation, install the required OpenTelemetry packages:
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 *
 * For specific framework instrumentation, install the corresponding package:
 * - Express: @opentelemetry/instrumentation-express
 * - Fastify: @opentelemetry/instrumentation-fastify
 * - Koa: @opentelemetry/instrumentation-koa
 * - PostgreSQL: @opentelemetry/instrumentation-pg
 * - MySQL: @opentelemetry/instrumentation-mysql2
 * - MongoDB: @opentelemetry/instrumentation-mongodb
 * - Redis: @opentelemetry/instrumentation-redis
 * - Fetch: @opentelemetry/instrumentation-fetch
 */

// Initialize RootSense SDK with auto-instrumentation enabled (default)
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required

  serviceName: "my-service",
  environment: "production",
  version: "1.0.0",
  projectId: "YOUR_PROJECT_ID", // Required for OpenTelemetry instrumentation

  // OpenTelemetry auto-instrumentation is enabled by default
  enableAutoInstrumentation: true, // Set to false to disable

  enableMetrics: true,
  enableErrorTracking: true,
  sanitizePII: true,
  enableWebSocket: false, // Enable for real-time streaming
  maxBufferSize: 1000,
  flushInterval: 5000, // 5 seconds
  batchSize: 100,
  tags: {
    region: "us-east-1",
    team: "backend",
  },
});

// Manual error capture
try {
  throw new Error("Something went wrong");
} catch (error) {
  sdk.captureError(error as Error, {
    additional: {
      userId: "12345",
      action: "processPayment",
    },
  });
}

// Add breadcrumbs for debugging
sdk.addBreadcrumb("User logged in", "auth", "info", { userId: "12345" });
sdk.addBreadcrumb("Payment processed", "payment", "info", { amount: 100 });

// Manual metric recording (usually done automatically by middleware)
sdk.recordRequest("GET", "/api/users", 200, 150);

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  process.exit(0);
});
