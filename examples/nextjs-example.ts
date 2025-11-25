/**
 * Next.js Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - Next.js API routes (HTTP requests/responses)
 * - Database queries (PostgreSQL, MySQL, MongoDB)
 * - External API calls via Fetch API
 *
 * Install required packages:
 * npm install next react react-dom
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-http @opentelemetry/instrumentation-fetch
 *
 * For database instrumentation:
 * - PostgreSQL: npm install @opentelemetry/instrumentation-pg pg
 * - MySQL: npm install @opentelemetry/instrumentation-mysql2 mysql2
 * - MongoDB: npm install @opentelemetry/instrumentation-mongodb mongodb
 *
 * IMPORTANT: Initialize SDK in a separate file (e.g., lib/rootsense.ts) to avoid
 * multiple initializations across different API routes.
 */

// lib/rootsense.ts - Create this file to initialize SDK once
import { init } from "rootsense-nodejs-sdk";

export const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "nextjs-example",
  environment: "production",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

// pages/api/health.ts
import { NextApiRequest, NextApiResponse } from "next";
import { nextjsMiddleware } from "rootsense-nodejs-sdk";
import { sdk } from "../../lib/rootsense";

export default nextjsMiddleware(sdk)(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      res.status(200).json({ status: "ok" });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  }
);

// pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { nextjsMiddleware } from "rootsense-nodejs-sdk";
import { sdk } from "../../lib/rootsense";

export default nextjsMiddleware(sdk)(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { id } = req.query;

    // Example: External API call (automatically instrumented via Fetch API)
    // const response = await fetch('https://api.example.com/users/' + id);
    // const data = await response.json();

    res.status(200).json({ id, name: "John Doe" });
  }
);
