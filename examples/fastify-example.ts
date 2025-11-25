import Fastify from "fastify";
import { init, fastifyPlugin } from "../src";

/**
 * Fastify Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - Fastify HTTP requests/responses
 * - Database queries (PostgreSQL, MySQL, MongoDB)
 * - External API calls
 *
 * Install required packages:
 * npm install fastify
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-fastify @opentelemetry/instrumentation-http
 */

const fastify = Fastify({ logger: true });

// Initialize RootSense SDK with auto-instrumentation
// OpenTelemetry will automatically instrument Fastify and any installed databases
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "fastify-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

// Register RootSense plugin (works alongside OpenTelemetry instrumentation)
fastify.register(fastifyPlugin(sdk));

// Example routes
fastify.get("/health", async (request, reply) => {
  return { status: "ok" };
});

fastify.get("/users/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  return { id, name: "John Doe" };
});

fastify.post("/users", async (request, reply) => {
  const body = request.body as { email?: string };
  if (body.email === "error@example.com") {
    throw new Error("Invalid email address");
  }
  return { id: 1, ...body };
});

fastify.get("/error", async () => {
  throw new Error("This is a test error");
});

// Example: Database query (automatically instrumented)
// Uncomment and install the corresponding package:
/*
import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://...' });

fastify.get('/db-example/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  // This query will be automatically tracked
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
});
*/

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log("Fastify server running on port 3000");
    console.log("OpenTelemetry auto-instrumentation is active");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  await fastify.close();
  process.exit(0);
});
