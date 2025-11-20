import { init } from "../src";

// Initialize RootSense SDK
const sdk = init({
  // Option 1: Use DSN (recommended)
  dsn: "https://YOUR_API_KEY@api.rootsense.ai/v1",

  // Option 2: Use separate API key and URL
  // apiKey: 'YOUR_API_KEY',
  // apiUrl: 'https://api.rootsense.ai/v1',

  serviceName: "my-service",
  environment: "production",
  version: "1.0.0",
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
