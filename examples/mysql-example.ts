import express from "express";
import mysql from "mysql2/promise";
import { init, expressMiddleware, expressErrorHandler } from "../src";

/**
 * MySQL Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - HTTP requests/responses (Express)
 * - MySQL database queries (automatically tracked)
 * - Query latency, errors, and connection issues
 *
 * Install required packages:
 * npm install express mysql2
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
 * npm install @opentelemetry/instrumentation-mysql2
 */

const app = express();
app.use(express.json());

// Initialize RootSense SDK with auto-instrumentation
// MySQL queries will be automatically tracked
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "mysql-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

// Initialize MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "mydb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(expressMiddleware(sdk));

// Example: Get user by ID (automatically instrumented)
app.get("/users/:id", async (req, res, next) => {
  try {
    // This query is automatically tracked by OpenTelemetry
    // It will capture: query text, duration, connection info, errors
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);

    const users = rows as any[];
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(users[0]);
  } catch (error) {
    next(error);
  }
});

// Example: Create user (automatically instrumented)
app.post("/users", async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // This query is automatically tracked
    const [result] = await pool.execute(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [name, email]
    );

    const insertResult = result as any;
    res.status(201).json({
      id: insertResult.insertId,
      name,
      email,
    });
  } catch (error) {
    next(error);
  }
});

// Example: Complex query with joins (automatically instrumented)
app.get("/users/:id/posts", async (req, res, next) => {
  try {
    // Complex queries are automatically tracked
    const [rows] = await pool.execute(
      `SELECT u.*, p.* 
       FROM users u 
       LEFT JOIN posts p ON u.id = p.user_id 
       WHERE u.id = ?`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Example: Transaction (automatically instrumented)
app.post("/users/:id/transfer", async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // All queries within transaction are tracked
    await connection.execute(
      "UPDATE accounts SET balance = balance - ? WHERE user_id = ?",
      [req.body.amount, req.params.id]
    );

    await connection.execute(
      "UPDATE accounts SET balance = balance + ? WHERE user_id = ?",
      [req.body.amount, req.body.toUserId]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.use(expressErrorHandler(sdk));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MySQL example server running on port ${PORT}`);
  console.log("OpenTelemetry is automatically tracking all MySQL queries");
  console.log("All queries, transactions, and errors are being monitored");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  await sdk.shutdown();
  process.exit(0);
});
