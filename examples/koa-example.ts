import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { init, koaMiddleware } from "../src";

/**
 * Koa Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - Koa HTTP requests/responses
 * - Database queries
 * - External API calls
 *
 * Install required packages:
 * npm install koa @koa/router koa-bodyparser
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-koa @opentelemetry/instrumentation-http
 */

const app = new Koa();
const router = new Router();

// Initialize RootSense SDK with auto-instrumentation
// OpenTelemetry will automatically instrument Koa and any installed databases
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "koa-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

// Use RootSense middleware (works alongside OpenTelemetry instrumentation)
app.use(koaMiddleware(sdk));
app.use(bodyParser());

// Example routes
router.get("/health", (ctx) => {
  ctx.body = { status: "ok" };
});

router.get("/users/:id", (ctx) => {
  const id = ctx.params.id;
  ctx.body = { id, name: "John Doe" };
});

router.post("/users", (ctx) => {
  const body = ctx.request.body as { email?: string };
  if (body.email === "error@example.com") {
    throw new Error("Invalid email address");
  }
  ctx.body = { id: 1, ...body };
});

router.get("/error", () => {
  throw new Error("This is a test error");
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Koa server running on port ${PORT}`);
  console.log("OpenTelemetry auto-instrumentation is active");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  process.exit(0);
});
