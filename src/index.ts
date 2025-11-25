// Core SDK
export { RootSenseSDK, init, getInstance } from "./core/sdk";
export type { RootSenseConfig } from "./types";

// Middleware
export { expressMiddleware, expressErrorHandler } from "./middleware/express";
export { fastifyPlugin } from "./middleware/fastify";
export { koaMiddleware } from "./middleware/koa";
export { RootSenseInterceptor } from "./middleware/nestjs";
export { nextjsMiddleware } from "./middleware/nextjs";

// Utilities
export { ErrorTracker } from "./tracking/error-tracker";
export { MetricsCollector } from "./collectors/metrics";

// Instrumentation
export { AutoInstrumentation } from "./instrumentation/auto";
export { RootSenseSpanExporter, RootSenseMetricExporter } from "./instrumentation/exporters";

// Types
export type {
  ErrorEvent,
  MessageEvent,
  MetricEvent,
  SpanEvent,
  RootSenseEvent,
  RequestContext,
  ResponseContext,
  Breadcrumb,
  BatchPayload,
} from "./types";
