import express from "express";
import { init, expressMiddleware, expressErrorHandler } from "../src";

/**
 * Fetch API Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - HTTP requests/responses (Express)
 * - External API calls via Fetch API (automatically tracked)
 * - Request/response latency, status codes, errors
 *
 * Install required packages:
 * npm install express
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
 * npm install @opentelemetry/instrumentation-fetch
 *
 * Note: Fetch API instrumentation works in Node.js 18+ (native fetch) or with node-fetch
 */

const app = express();
app.use(express.json());

// Initialize RootSense SDK with auto-instrumentation
// Fetch API calls will be automatically tracked
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "fetch-api-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

app.use(expressMiddleware(sdk));

// Example: Simple GET request (automatically instrumented)
app.get("/external-data", async (req, res, next) => {
  try {
    // This fetch call is automatically tracked by OpenTelemetry
    // It will capture: URL, method, status code, duration, errors
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/posts/1"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Example: POST request with body (automatically instrumented)
app.post("/create-external", async (req, res, next) => {
  try {
    // POST requests are automatically tracked
    const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// Example: Multiple parallel requests (all automatically instrumented)
app.get("/aggregate-data", async (req, res, next) => {
  try {
    // All fetch calls are automatically tracked
    const [users, posts, comments] = await Promise.all([
      fetch("https://jsonplaceholder.typicode.com/users").then((r) => r.json()),
      fetch("https://jsonplaceholder.typicode.com/posts").then((r) => r.json()),
      fetch("https://jsonplaceholder.typicode.com/comments").then((r) =>
        r.json()
      ),
    ]);

    res.json({
      users: users.length,
      posts: posts.length,
      comments: comments.length,
    });
  } catch (error) {
    next(error);
  }
});

// Example: Request with custom headers (automatically instrumented)
app.get("/authenticated-request", async (req, res, next) => {
  try {
    // Fetch with headers is automatically tracked
    const response = await fetch("https://api.example.com/protected", {
      headers: {
        Authorization: `Bearer ${req.headers.authorization}`,
        "X-API-Key": process.env.API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Example: Error handling (automatically tracked)
app.get("/error-example", async (req, res, next) => {
  try {
    // Failed requests are automatically tracked with error details
    const response = await fetch("https://httpstat.us/500");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    // Error is automatically captured by OpenTelemetry
    next(error);
  }
});

// Example: Timeout handling (automatically tracked)
app.get("/timeout-example", async (req, res, next) => {
  try {
    // Requests with timeout are automatically tracked
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://httpbin.org/delay/10", {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    // Timeout errors are automatically captured
    next(error);
  }
});

app.use(expressErrorHandler(sdk));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fetch API example server running on port ${PORT}`);
  console.log("OpenTelemetry is automatically tracking all Fetch API calls");
  console.log(
    "All external API requests, responses, and errors are being monitored"
  );
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  process.exit(0);
});
