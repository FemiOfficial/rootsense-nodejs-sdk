import express from "express";
import { init, expressMiddleware, expressErrorHandler } from "../src";

/**
 * Express Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - HTTP requests/responses (latency, status codes, errors)
 * - Database queries (if using PostgreSQL, MySQL, or MongoDB)
 * - External API calls (via Fetch API)
 *
 * Install required packages:
 * npm install express
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
 *
 * For database instrumentation, also install:
 * - PostgreSQL: npm install @opentelemetry/instrumentation-pg pg
 * - MySQL: npm install @opentelemetry/instrumentation-mysql2 mysql2
 * - MongoDB: npm install @opentelemetry/instrumentation-mongodb mongodb
 */

const app = express();
app.use(express.json());

// Initialize RootSense SDK with auto-instrumentation
// OpenTelemetry will automatically instrument Express, HTTP, and any installed databases
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "express-example",
  environment: "development",
  version: "1.0.0",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
  sanitizePII: true,
});

// Use RootSense middleware (works alongside OpenTelemetry instrumentation)
// The middleware provides additional context, while OpenTelemetry tracks spans
app.use(expressMiddleware(sdk));

// Example routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/users/:id", (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId, name: "John Doe" });
});

app.post("/users", (req, res) => {
  // Simulate error
  if (req.body.email === "error@example.com") {
    throw new Error("Invalid email address");
  }
  res.json({ id: 1, ...req.body });
});

app.get("/error", (req, res, next) => {
  next(new Error("This is a test error"));
});

// Error handler (should be last)
app.use(expressErrorHandler(sdk));

// Example: Database query (automatically instrumented if pg/mysql2/mongodb is installed)
// Uncomment and install the corresponding package to see instrumentation in action:
/*
import { Pool } from 'pg'; // or mysql2, mongodb
const pool = new Pool({ connectionString: 'postgresql://...' });

app.get('/db-example', async (req, res) => {
  // This query will be automatically tracked by OpenTelemetry
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(result.rows);
});
*/

// Example: External API call (automatically instrumented via Fetch API)
app.get("/external-api", async (req, res) => {
  // Fetch API calls are automatically instrumented
  const response = await fetch("https://api.example.com/data");
  const data = await response.json();
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  console.log("OpenTelemetry auto-instrumentation is active");
  console.log(
    "All HTTP requests, database queries, and external API calls are being tracked"
  );
});

// Graceful shutdown ensures all telemetry data is flushed
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  process.exit(0);
});
