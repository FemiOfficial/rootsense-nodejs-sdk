import express from "express";
import { Pool } from "pg";
import { init, expressMiddleware, expressErrorHandler } from "../src";

/**
 * PostgreSQL Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - HTTP requests/responses (Express)
 * - PostgreSQL database queries (automatically tracked)
 * - Query latency, errors, and connection issues
 *
 * Install required packages:
 * npm install express pg
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
 * npm install @opentelemetry/instrumentation-pg
 */

const app = express();
app.use(express.json());

// Initialize RootSense SDK with auto-instrumentation
// PostgreSQL queries will be automatically tracked
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "postgresql-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://user:password@localhost:5432/mydb",
});

app.use(expressMiddleware(sdk));

// Example: Get user by ID (automatically instrumented)
app.get("/users/:id", async (req, res, next) => {
  try {
    // This query is automatically tracked by OpenTelemetry
    // It will capture: query text, duration, connection info, errors
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Example: Create user (automatically instrumented)
app.post("/users", async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // This query is automatically tracked
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Example: Complex query with joins (automatically instrumented)
app.get("/users/:id/posts", async (req, res, next) => {
  try {
    // Complex queries are automatically tracked
    const result = await pool.query(
      `SELECT u.*, p.* 
       FROM users u 
       LEFT JOIN posts p ON u.id = p.user_id 
       WHERE u.id = $1`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Example: Transaction (automatically instrumented)
app.post("/users/:id/transfer", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // All queries within transaction are tracked
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE user_id = $2",
      [req.body.amount, req.params.id]
    );

    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE user_id = $2",
      [req.body.amount, req.body.toUserId]
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.use(expressErrorHandler(sdk));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PostgreSQL example server running on port ${PORT}`);
  console.log("OpenTelemetry is automatically tracking all PostgreSQL queries");
  console.log("All queries, transactions, and errors are being monitored");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  await sdk.shutdown();
  process.exit(0);
});
