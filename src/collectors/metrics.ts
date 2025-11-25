import * as promClient from "prom-client";
import { RootSenseConfig } from "../types";

export class MetricsCollector {
  private register: promClient.Registry;
  private httpRequestDuration: promClient.Histogram<string>;
  private httpRequestTotal: promClient.Counter<string>;
  private httpRequestErrors: promClient.Counter<string>;
  private activeRequests: promClient.Gauge<string>;
  private memoryUsage: promClient.Gauge<string>;
  private eventLoopLag: promClient.Gauge<string>;
  private config: RootSenseConfig;

  constructor(config: RootSenseConfig) {
    this.config = config;
    this.register = new promClient.Registry();

    // HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code", "service"],
      registers: [this.register],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code", "service"],
      registers: [this.register],
    });

    this.httpRequestErrors = new promClient.Counter({
      name: "http_request_errors_total",
      help: "Total number of HTTP request errors",
      labelNames: ["method", "route", "error_type", "service"],
      registers: [this.register],
    });

    this.activeRequests = new promClient.Gauge({
      name: "http_active_requests",
      help: "Number of active HTTP requests",
      labelNames: ["service"],
      registers: [this.register],
    });

    // System metrics
    this.memoryUsage = new promClient.Gauge({
      name: "process_memory_usage_bytes",
      help: "Memory usage in bytes",
      labelNames: ["type", "service"],
      registers: [this.register],
    });

    this.eventLoopLag = new promClient.Gauge({
      name: "nodejs_eventloop_lag_seconds",
      help: "Event loop lag in seconds",
      labelNames: ["service"],
      registers: [this.register],
    });

    // Collect default metrics
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: "rootsense_",
    });

    // Start collecting system metrics
    this.startSystemMetricsCollection();
  }

  private startSystemMetricsCollection(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const service = this.config.serviceName || "unknown-service";

      this.memoryUsage.set({ type: "rss", service }, memUsage.rss);
      this.memoryUsage.set({ type: "heapTotal", service }, memUsage.heapTotal);
      this.memoryUsage.set({ type: "heapUsed", service }, memUsage.heapUsed);
      this.memoryUsage.set({ type: "external", service }, memUsage.external);

      // Measure event loop lag
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        const lag = Number(delta) / 1e9;
        this.eventLoopLag.set({ service }, lag);
      });
    }, 5000);
  }

  recordRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    const service = this.config.serviceName || "unknown-service";
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      service,
    };

    this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
    this.httpRequestTotal.inc(labels);
  }

  recordError(method: string, route: string, errorType: string): void {
    const service = this.config.serviceName || "unknown-service";
    this.httpRequestErrors.inc({
      method,
      route,
      error_type: errorType,
      service,
    });
  }

  incrementActiveRequests(): void {
    const service = this.config.serviceName || "unknown-service";
    this.activeRequests.inc({ service });
  }

  decrementActiveRequests(): void {
    const service = this.config.serviceName || "unknown-service";
    this.activeRequests.dec({ service });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  async getMetricsAsJSON(): Promise<any[]> {
    return this.register.getMetricsAsJSON();
  }

  getRegister(): promClient.Registry {
    return this.register;
  }
}
