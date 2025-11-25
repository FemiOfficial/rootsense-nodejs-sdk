import express from "express";
import { MongoClient, Db, Collection } from "mongodb";
import { init, expressMiddleware, expressErrorHandler } from "../src";

/**
 * MongoDB Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - HTTP requests/responses (Express)
 * - MongoDB operations (automatically tracked)
 * - Query latency, errors, and connection issues
 *
 * Install required packages:
 * npm install express mongodb
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
 * npm install @opentelemetry/instrumentation-mongodb
 */

const app = express();
app.use(express.json());

// Initialize RootSense SDK with auto-instrumentation
// MongoDB operations will be automatically tracked
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "mongodb-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

// Initialize MongoDB connection
const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://localhost:27017"
);
let db: Db;
let usersCollection: Collection;

(async () => {
  try {
    await client.connect();
    db = client.db("mydb");
    usersCollection = db.collection("users");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
})();

app.use(expressMiddleware(sdk));

// Example: Get user by ID (automatically instrumented)
app.get("/users/:id", async (req, res, next) => {
  try {
    // This operation is automatically tracked by OpenTelemetry
    // It will capture: operation type, collection, query, duration, errors
    const user = await usersCollection.findOne({ _id: req.params.id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Example: Create user (automatically instrumented)
app.post("/users", async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // This operation is automatically tracked
    const result = await usersCollection.insertOne({ name, email });

    res.status(201).json({
      _id: result.insertedId,
      name,
      email,
    });
  } catch (error) {
    next(error);
  }
});

// Example: Update user (automatically instrumented)
app.put("/users/:id", async (req, res, next) => {
  try {
    // Update operations are automatically tracked
    const result = await usersCollection.updateOne(
      { _id: req.params.id },
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Example: Complex aggregation query (automatically instrumented)
app.get("/users/stats", async (req, res, next) => {
  try {
    // Aggregation pipelines are automatically tracked
    const stats = await usersCollection
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgAge: { $avg: "$age" },
          },
        },
      ])
      .toArray();

    res.json(stats[0] || { total: 0, avgAge: 0 });
  } catch (error) {
    next(error);
  }
});

// Example: Find with filter (automatically instrumented)
app.get("/users", async (req, res, next) => {
  try {
    // Find operations are automatically tracked
    const users = await usersCollection.find(req.query).limit(100).toArray();

    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.use(expressErrorHandler(sdk));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MongoDB example server running on port ${PORT}`);
  console.log("OpenTelemetry is automatically tracking all MongoDB operations");
  console.log("All queries, updates, and errors are being monitored");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await client.close();
  await sdk.shutdown();
  process.exit(0);
});
