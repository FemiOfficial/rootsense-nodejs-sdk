# RootSense Node.js SDK

[![npm version](https://img.shields.io/npm/v/rootsense-nodejs-sdk.svg)](https://www.npmjs.com/package/rootsense-nodejs-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

NodeJS SDK for RootSense - AI-powered incident management platform with automatic error tracking, infrastructure monitoring, and intelligent root cause analysis.

## Features

- 🔍 **Automatic Error Tracking** - Capture errors with full stack traces and context
- 📊 **Prometheus Metrics** - Built-in metrics collection using [prom-client](https://github.com/siimon/prom-client)
- 🚀 **Batch Processing** - Efficient batch sending without interrupting your application
- 🔐 **PII Protection** - Automatic sanitization of sensitive data
- 🔌 **WebSocket Support** - Real-time streaming of events
- 🎯 **Framework Support** - Works with Express, Fastify, Koa, NestJS, Next.js, and more
- 🔄 **Retry Logic** - Automatic retry with exponential backoff
- 🏷️ **Error Fingerprinting** - Intelligent error grouping
- 📝 **Breadcrumbs** - Contextual logging for debugging

## Installation

```bash
npm install rootsense-nodejs-sdk
# or
yarn add rootsense-nodejs-sdk
```

## Requirements

- Node.js 18+ (for native `fetch` support)
- TypeScript 5.0+ (optional, but recommended)

## Quick Start

### Basic Usage

```typescript
import { init } from "rootsense-nodejs-sdk";

// Initialize the SDK
const sdk = init({
  dsn: "https://YOUR_API_KEY@api.rootsense.ai/v1",
  serviceName: "my-service",
  environment: "production",
  version: "1.0.0",
});

// Capture an error
try {
  throw new Error("Something went wrong");
} catch (error) {
  sdk.captureError(error);
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  process.exit(0);
});
```

### Express.js

```typescript
import express from "express";
import {
  init,
  expressMiddleware,
  expressErrorHandler,
} from "rootsense-nodejs-sdk";

const app = express();
app.use(express.json());

// Initialize SDK
const sdk = init({
  dsn: "https://YOUR_API_KEY@api.rootsense.ai/v1",
  serviceName: "express-app",
  environment: "production",
});

// Use middleware
app.use(expressMiddleware(sdk));

// Your routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handler (should be last)
app.use(expressErrorHandler(sdk));

app.listen(3000);
```

### Fastify

```typescript
import Fastify from "fastify";
import { init, fastifyPlugin } from "rootsense-nodejs-sdk";

const fastify = Fastify();

const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  serviceName: "fastify-app",
});

// Register plugin
fastify.register(fastifyPlugin(sdk));

fastify.listen({ port: 3000 });
```

### Koa

```typescript
import Koa from "koa";
import { init, koaMiddleware } from "rootsense-nodejs-sdk";

const app = new Koa();

const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  serviceName: "koa-app",
});

app.use(koaMiddleware(sdk));

app.listen(3000);
```

### NestJS

```typescript
import { Module, Controller, UseInterceptors } from "@nestjs/common";
import { init, RootSenseInterceptor } from "rootsense-nodejs-sdk";

const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  serviceName: "nestjs-app",
});

@Controller()
@UseInterceptors(new RootSenseInterceptor(sdk))
export class AppController {
  // Your controllers
}
```

### Next.js

```typescript
// pages/api/health.ts
import { NextApiRequest, NextApiResponse } from "next";
import { init, nextjsMiddleware } from "rootsense-nodejs-sdk";

const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  serviceName: "nextjs-app",
});

export default nextjsMiddleware(sdk)(
  async (req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).json({ status: "ok" });
  }
);
```

## Configuration

### Configuration Options

```typescript
interface RootSenseConfig {
  // Authentication (required - either dsn or apiKey)
  dsn?: string; // Format: https://API_KEY@api.rootsense.ai/v1
  apiKey?: string; // API key for authentication
  apiUrl?: string; // API endpoint URL (default: https://api.rootsense.ai/v1)

  // Service Information
  serviceName?: string; // Service name (default: 'unknown-service')
  environment?: string; // Environment (default: 'production')
  version?: string; // Service version (default: '1.0.0')
  tags?: Record<string, string>; // Additional tags

  // Batching & Buffering
  maxBufferSize?: number; // Max buffer size (default: 1000)
  flushInterval?: number; // Flush interval in ms (default: 5000)
  batchSize?: number; // Batch size for sending (default: 100)

  // Features
  enableWebSocket?: boolean; // Enable WebSocket streaming (default: false)
  websocketUrl?: string; // WebSocket URL (auto-derived from apiUrl)
  enableMetrics?: boolean; // Enable Prometheus metrics (default: true)
  enableErrorTracking?: boolean; // Enable error tracking (default: true)

  // PII Protection
  sanitizePII?: boolean; // Enable PII sanitization (default: true)
  piiFields?: string[]; // Custom PII fields to sanitize

  // Retry & Timeout
  retryAttempts?: number; // Number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in ms (default: 1000)
  timeout?: number; // Request timeout in ms (default: 10000)
}
```

### Example Configuration

```typescript
const sdk = init({
  // Option 1: Use DSN (recommended)
  dsn: "https://YOUR_API_KEY@api.rootsense.ai/v1",

  // Option 2: Use separate API key and URL
  // apiKey: 'YOUR_API_KEY',
  // apiUrl: 'https://api.rootsense.ai/v1',

  serviceName: "user-service",
  environment: "production",
  version: "1.2.3",

  // Batching configuration
  maxBufferSize: 2000,
  flushInterval: 10000, // 10 seconds
  batchSize: 200,

  // Enable WebSocket for real-time streaming
  enableWebSocket: true,

  // PII protection
  sanitizePII: true,
  piiFields: ["password", "token", "ssn", "creditCard"],

  // Custom tags
  tags: {
    region: "us-east-1",
    team: "backend",
    datacenter: "aws",
  },
});
```

## API Reference

### Core Methods

#### `init(config: RootSenseConfig): RootSenseSDK`

Initialize the RootSense SDK. Returns a singleton instance.

#### `sdk.captureError(error: Error, context?: {...}): void`

Capture an error with optional context.

```typescript
sdk.captureError(new Error('Something went wrong'), {
  request: {
    method: 'POST',
    path: '/api/users',
    headers: { ... },
    body: { ... },
  },
  response: {
    statusCode: 500,
    duration: 150,
  },
  additional: {
    userId: '12345',
    action: 'processPayment',
  },
});
```

#### `sdk.recordRequest(method: string, route: string, statusCode: number, duration: number): void`

Manually record a request (usually done automatically by middleware).

#### `sdk.addBreadcrumb(message: string, category?: string, level?: string, data?: object): void`

Add a breadcrumb for debugging.

```typescript
sdk.addBreadcrumb("User logged in", "auth", "info", { userId: "12345" });
sdk.addBreadcrumb("Payment processed", "payment", "info", { amount: 100 });
```

#### `sdk.flush(): Promise<void>`

Manually flush the buffer (send all pending events).

#### `sdk.shutdown(): Promise<void>`

Gracefully shutdown the SDK, flushing all pending events.

### Middleware

#### Express

- `expressMiddleware(sdk: RootSenseSDK)` - Request/response tracking middleware
- `expressErrorHandler(sdk: RootSenseSDK)` - Error handler middleware

#### Fastify

- `fastifyPlugin(sdk: RootSenseSDK)` - Fastify plugin

#### Koa

- `koaMiddleware(sdk: RootSenseSDK)` - Koa middleware

#### NestJS

- `RootSenseInterceptor` - NestJS interceptor class

#### Next.js

- `nextjsMiddleware(sdk: RootSenseSDK)` - Next.js API route wrapper

## Prometheus Metrics

The SDK automatically collects Prometheus metrics using `prom-client`:

- `http_request_duration_seconds` - HTTP request duration histogram
- `http_requests_total` - Total HTTP requests counter
- `http_request_errors_total` - HTTP request errors counter
- `http_active_requests` - Active HTTP requests gauge
- `process_memory_usage_bytes` - Memory usage gauge
- `nodejs_eventloop_lag_seconds` - Event loop lag gauge
- Plus all default Node.js metrics with `rootsense_` prefix

Metrics are automatically sent to the backend in batches along with error events.

## Error Fingerprinting

Errors are automatically fingerprinted using:

- Error type (e.g., `TypeError`, `ReferenceError`)
- Service name
- Endpoint path

This allows RootSense to group similar errors together for better incident management.

## PII Protection

The SDK automatically sanitizes common PII fields:

- `password`, `token`, `authorization`, `apiKey`, `secret`
- `ssn`, `creditCard`, `email`, `phone`, `address`

You can customize the list via `piiFields` in the configuration.

## WebSocket Streaming

Enable real-time streaming by setting `enableWebSocket: true`:

```typescript
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  enableWebSocket: true,
});
```

Events are sent via WebSocket in addition to batch HTTP requests.

## Batch Processing

The SDK buffers events locally and sends them in batches:

- **Buffer Size**: Configurable via `maxBufferSize` (default: 1000)
- **Flush Interval**: Automatic flush every `flushInterval` ms (default: 5000)
- **Batch Size**: Events are sent in batches of `batchSize` (default: 100)

This ensures minimal impact on your application's performance.

## Retry Logic

Failed requests are automatically retried with exponential backoff:

- **Retry Attempts**: Configurable via `retryAttempts` (default: 3)
- **Retry Delay**: Starts at `retryDelay` ms and doubles each attempt (default: 1000ms)
- **Timeout**: Request timeout via `timeout` (default: 10000ms)

The SDK fails silently on errors to prevent crashing your application.

## Examples

See the `examples/` directory for complete examples:

- `express-example.ts` - Express.js integration
- `fastify-example.ts` - Fastify integration
- `koa-example.ts` - Koa integration
- `nestjs-example.ts` - NestJS integration
- `nextjs-example.ts` - Next.js integration
- `basic-usage.ts` - Basic usage without framework

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run linter
npm run lint
```

## Architecture

The SDK is designed with the following architecture:

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Middleware│
    └────┬────┘
         │
    ┌────▼────────┐
    │  RootSense  │
    │     SDK     │
    └─────┬───────┘
          │
    ┌─────┴──────┐
    │            │
┌───▼───┐  ┌────▼────┐
│Metrics│  │  Error  │
│Collector│ │ Tracker │
└───┬───┘  └────┬────┘
    │           │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │   Batch   │
    │   Sender  │
    └─────┬─────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐  ┌───▼────┐
│ HTTP  │  │ WebSocket│
│ Batch │  │ Stream  │
└───────┘  └─────────┘
```

## License

MIT

## Support

For issues, questions, or contributions, please visit our [GitHub repository](https://github.com/your-org/rootsense-nodejs-sdk).

## Changelog

### 0.1.0

- Initial release
- Express, Fastify, Koa, NestJS, Next.js middleware support
- Prometheus metrics collection
- Error tracking with fingerprinting
- PII protection
- WebSocket streaming support
- Batch processing with retry logic
