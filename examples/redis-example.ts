import express from "express";
import { createClient } from "redis";
import { init, expressMiddleware, expressErrorHandler } from "../src";

/**
 * Redis Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - HTTP requests/responses (Express)
 * - Redis operations (automatically tracked)
 * - Cache hits/misses, latency, connection issues
 *
 * Install required packages:
 * npm install express redis
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
 * npm install @opentelemetry/instrumentation-redis
 */

const app = express();
app.use(express.json());

// Initialize RootSense SDK with auto-instrumentation
// Redis operations will be automatically tracked
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "redis-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

// Initialize Redis client
const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  try {
    await redis.connect();
    console.log("Connected to Redis");
  } catch (error) {
    console.error("Redis connection error:", error);
  }
})();

app.use(expressMiddleware(sdk));

// Example: Cache with Redis (automatically instrumented)
app.get("/users/:id", async (req, res, next) => {
  try {
    const cacheKey = `user:${req.params.id}`;

    // GET operation is automatically tracked
    let user = await redis.get(cacheKey);

    if (user) {
      // Cache hit - tracked automatically
      return res.json(JSON.parse(user));
    }

    // Simulate database query
    const dbUser = {
      id: req.params.id,
      name: "John Doe",
      email: "john@example.com",
    };

    // SET operation is automatically tracked
    // Cache for 1 hour
    await redis.setEx(cacheKey, 3600, JSON.stringify(dbUser));

    res.json(dbUser);
  } catch (error) {
    next(error);
  }
});

// Example: Session management (automatically instrumented)
app.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Simulate authentication
    const sessionId = `session:${Date.now()}`;
    const sessionData = {
      userId: "123",
      username,
      loginTime: new Date().toISOString(),
    };

    // SET operation is automatically tracked
    await redis.setEx(sessionId, 3600, JSON.stringify(sessionData));

    res.json({ sessionId });
  } catch (error) {
    next(error);
  }
});

// Example: Rate limiting (automatically instrumented)
app.post("/api/endpoint", async (req, res, next) => {
  try {
    const clientId = req.headers["x-client-id"] || "anonymous";
    const rateLimitKey = `ratelimit:${clientId}`;

    // INCR operation is automatically tracked
    const count = await redis.incr(rateLimitKey);

    if (count === 1) {
      // Set expiration on first request
      await redis.expire(rateLimitKey, 60); // 60 seconds window
    }

    if (count > 100) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    res.json({ success: true, requests: count });
  } catch (error) {
    next(error);
  }
});

// Example: Pub/Sub (automatically instrumented)
app.post("/notify", async (req, res, next) => {
  try {
    const { channel, message } = req.body;

    // PUBLISH operation is automatically tracked
    await redis.publish(channel, JSON.stringify(message));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Example: Hash operations (automatically instrumented)
app.post("/users/:id/metadata", async (req, res, next) => {
  try {
    const hashKey = `user:${req.params.id}:metadata`;

    // HSET operation is automatically tracked
    for (const [field, value] of Object.entries(req.body)) {
      await redis.hSet(hashKey, field, String(value));
    }

    // Set expiration
    await redis.expire(hashKey, 3600);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Example: List operations (automatically instrumented)
app.post("/queue/:queueName", async (req, res, next) => {
  try {
    const queueName = `queue:${req.params.queueName}`;

    // LPUSH operation is automatically tracked
    await redis.lPush(queueName, JSON.stringify(req.body));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use(expressErrorHandler(sdk));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Redis example server running on port ${PORT}`);
  console.log("OpenTelemetry is automatically tracking all Redis operations");
  console.log(
    "All GET, SET, INCR, PUBLISH, and other operations are being monitored"
  );
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await redis.quit();
  await sdk.shutdown();
  process.exit(0);
});
