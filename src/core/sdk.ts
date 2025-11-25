import {
  RootSenseConfig,
  ErrorEvent,
  MetricEvent,
  Breadcrumb,
  RequestContext,
  ResponseContext,
} from "../types";
import { normalizeConfig } from "../utils/config";
import { MetricsCollector } from "../collectors/metrics";
import { BatchSender } from "../transport/batch-sender";
import { WebSocketClient } from "../transport/websocket";
import { ErrorTracker } from "../tracking/error-tracker";
import { AutoInstrumentation } from "../instrumentation/auto";

export class RootSenseSDK {
  private config: Required<RootSenseConfig>;
  private metricsCollector: MetricsCollector;
  private batchSender: BatchSender;
  private websocketClient: WebSocketClient;
  private errorTracker: ErrorTracker;
  private autoInstrumentation?: AutoInstrumentation;
  private initialized: boolean = false;

  constructor(config: RootSenseConfig) {
    this.config = normalizeConfig(config);
    this.metricsCollector = new MetricsCollector(this.config);
    this.batchSender = new BatchSender(this.config, this.metricsCollector);
    this.websocketClient = new WebSocketClient(this.config);
    this.errorTracker = new ErrorTracker(this.config);

    // Initialize auto-instrumentation if enabled
    if (this.config.enableAutoInstrumentation) {
      try {
        this.autoInstrumentation = new AutoInstrumentation(
          this.errorTracker,
          this.batchSender,
          this.config
        );
        this.autoInstrumentation.initialize();
      } catch (error) {
        console.warn("[RootSense] Auto-instrumentation not available:", error);
      }
    }

    // Setup global error handlers
    this.setupGlobalErrorHandlers();

    this.initialized = true;
  }

  private setupGlobalErrorHandlers(): void {
    if (!this.config.enableErrorTracking) {
      return;
    }

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      try {
        const errorEvent = this.errorTracker.captureError(error);
        this.batchSender.addError(errorEvent);
        if (this.config.enableWebSocket) {
          this.websocketClient.sendError(errorEvent);
        }
      } catch (err) {
        console.error("[RootSense] Error capturing uncaught exception:", err);
      }
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: unknown) => {
      try {
        const error =
          reason instanceof Error ? reason : new Error(String(reason));
        const errorEvent = this.errorTracker.captureError(error);
        this.batchSender.addError(errorEvent);
        if (this.config.enableWebSocket) {
          this.websocketClient.sendError(errorEvent);
        }
      } catch (err) {
        console.error("[RootSense] Error capturing unhandled rejection:", err);
      }
    });
  }

  captureError(
    error: Error,
    context?: {
      request?: RequestContext;
      response?: ResponseContext;
      additional?: Record<string, unknown>;
    }
  ): void {
    if (!this.config.enableErrorTracking) {
      return;
    }

    try {
      const errorEvent = this.errorTracker.captureError(error, context);
      this.batchSender.addError(errorEvent);

      if (this.config.enableWebSocket) {
        this.websocketClient.sendError(errorEvent);
      }
    } catch (err) {
      // Fail silently - don't crash the application
      console.error("[RootSense] Error capturing error:", err);
    }
  }

  recordRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    if (!this.config.enableMetrics) {
      return;
    }

    try {
      this.metricsCollector.recordRequest(method, route, statusCode, duration);

      if (statusCode >= 400) {
        this.metricsCollector.recordError(
          method,
          route,
          statusCode >= 500 ? "server_error" : "client_error"
        );
      }
    } catch (err) {
      console.error("[RootSense] Error recording request:", err);
    }
  }

  addBreadcrumb(
    message: string,
    category: string = "custom",
    level: "info" | "warning" | "error" | "debug" = "info",
    data?: Record<string, unknown>
  ): void {
    try {
      this.errorTracker.addBreadcrumb(message, category, level, data);
    } catch (err) {
      console.error("[RootSense] Error adding breadcrumb:", err);
    }
  }

  async flush(): Promise<void> {
    await this.batchSender.flush();
  }

  async shutdown(): Promise<void> {
    // Shutdown auto-instrumentation (await to ensure all telemetry is flushed)
    if (this.autoInstrumentation) {
      await this.autoInstrumentation.shutdown();
    }

    await this.batchSender.shutdown();
    this.websocketClient.close();
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  getErrorTracker(): ErrorTracker {
    return this.errorTracker;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let sdkInstance: RootSenseSDK | null = null;

export function init(config: RootSenseConfig): RootSenseSDK {
  if (sdkInstance) {
    console.warn(
      "[RootSense] SDK already initialized. Returning existing instance."
    );
    return sdkInstance;
  }
  sdkInstance = new RootSenseSDK(config);
  return sdkInstance;
}

export function getInstance(): RootSenseSDK | null {
  return sdkInstance;
}
