import {
  RootSenseConfig,
  BatchPayload,
  RootSenseEvent,
  ErrorEvent,
  MetricEvent,
} from "../types";
import { MetricsCollector } from "../collectors/metrics";

export class BatchSender {
  private config: Required<RootSenseConfig>;
  private buffer: RootSenseEvent[];
  private flushTimer?: NodeJS.Timeout;
  private metricsCollector: MetricsCollector;
  private isFlushing: boolean = false;

  constructor(
    config: Required<RootSenseConfig>,
    metricsCollector: MetricsCollector
  ) {
    this.config = config;
    this.buffer = [];
    this.metricsCollector = metricsCollector;
    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        console.error("[RootSense] Error flushing buffer:", err);
      });
    }, this.config.flushInterval);
  }

  addEvent(event: RootSenseEvent): void {
    if (this.buffer.length >= this.config.maxBufferSize) {
      // Buffer is full, try to flush immediately
      this.flush().catch((err) => {
        console.error("[RootSense] Error flushing full buffer:", err);
      });
    }

    this.buffer.push(event);
  }

  addError(error: ErrorEvent): void {
    this.addEvent(error);
  }

  addMetrics(metrics: MetricEvent): void {
    this.addEvent(metrics);
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      // Add Prometheus metrics if enabled
      if (this.config.enableMetrics) {
        const promMetrics = await this.metricsCollector.getMetricsAsJSON();
        // Convert Prometheus metrics to RootSense metric events
        for (const metric of promMetrics) {
          if (metric.values && Array.isArray(metric.values)) {
            for (const value of metric.values) {
              const metricEvent: MetricEvent = {
                event_id: this._generateEventId(),
                timestamp: new Date().toISOString(),
                type: "metric",
                metric_name: metric.name,
                name: metric.name,
                environment: this.config.environment,
                project_id: this.config.projectId,
                labels: value.labels || {},
                value: value.value,
                time_unix_nano: Date.now() * 1e6, // Convert to nanoseconds
              };
              this.buffer.push(metricEvent);
            }
          }
        }
      }

      // Clear buffer before sending (to allow new events during send)
      const toSend = [...this.buffer];
      this.buffer = [];

      // Send in batches matching Python SDK format
      const batches = this.chunkArray(toSend, this.config.batchSize);
      for (const batch of batches) {
        await this.sendBatch(batch);
      }
    } catch (error) {
      console.error("[RootSense] Error in flush:", error);
      // On error, buffer items were already cleared, but new events can be added
    } finally {
      this.isFlushing = false;
    }
  }

  async sendSuccessSignal(
    fingerprint: string,
    context: Record<string, unknown>
  ): Promise<void> {
    // Match Python SDK endpoint structure
    const baseUrl = this.config.apiUrl.replace(/\/v1\/?$/, ""); // Remove /v1 if present
    const url = `${baseUrl}/events/success`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.apiKey,
        },
        body: JSON.stringify({
          fingerprint,
          context,
          project_id: this.config.projectId,
          environment: this.config.environment,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        console.debug(
          `[RootSense] Failed to send success signal: HTTP ${response.status}`
        );
      }
    } catch (error) {
      // Fail silently for success signals
      console.debug("[RootSense] Error sending success signal:", error);
    }
  }

  private _generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async sendBatch(events: RootSenseEvent[]): Promise<void> {
    // Match Python SDK endpoint structure
    const baseUrl = this.config.apiUrl.replace(/\/v1\/?$/, ""); // Remove /v1 if present
    const url = `${baseUrl}/events/batch`;
    const payload: BatchPayload = { events };

    await this.sendWithRetry(url, payload);
  }

  private async sendWithRetry(url: string, data: BatchPayload): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.config.apiKey,
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        // Accept all 2xx responses as success (200-299)
        if (response.status >= 200 && response.status < 300) {
          return; // Success
        }

        if (response.status < 500) {
          // Client error (4xx), don't retry
          console.error(
            `[RootSense] Client error sending events: ${
              response.status
            } ${await response.text()}`
          );
          return;
        }

        // Server error, retry
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - fail silently but log
    console.error(
      `[RootSense] Failed to send batch after ${this.config.retryAttempts} attempts:`,
      lastError
    );
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}
