import { RootSenseConfig, BatchPayload, ErrorEvent, MetricEvent, Breadcrumb } from '../types';
import { MetricsCollector } from '../collectors/metrics';

export class BatchSender {
  private config: Required<RootSenseConfig>;
  private buffer: BatchPayload[];
  private flushTimer?: NodeJS.Timeout;
  private metricsCollector: MetricsCollector;
  private isFlushing: boolean = false;

  constructor(config: Required<RootSenseConfig>, metricsCollector: MetricsCollector) {
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
        console.error('[RootSense] Error flushing buffer:', err);
      });
    }, this.config.flushInterval);
  }

  addError(error: ErrorEvent): void {
    if (this.buffer.length >= this.config.maxBufferSize) {
      // Buffer is full, try to flush immediately
      this.flush().catch((err) => {
        console.error('[RootSense] Error flushing full buffer:', err);
      });
    }

    const payload: BatchPayload = {
      errors: [error],
      service: this.config.serviceName,
      timestamp: Date.now(),
    };
    this.buffer.push(payload);
  }

  addMetrics(metrics: MetricEvent): void {
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush().catch((err) => {
        console.error('[RootSense] Error flushing full buffer:', err);
      });
    }

    const payload: BatchPayload = {
      metrics: [metrics],
      service: this.config.serviceName,
      timestamp: Date.now(),
    };
    this.buffer.push(payload);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush().catch((err) => {
        console.error('[RootSense] Error flushing full buffer:', err);
      });
    }

    const payload: BatchPayload = {
      breadcrumbs: [breadcrumb],
      service: this.config.serviceName,
      timestamp: Date.now(),
    };
    this.buffer.push(payload);
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      // Merge buffer items
      const merged: BatchPayload = {
        errors: [],
        metrics: [],
        breadcrumbs: [],
        service: this.config.serviceName,
        timestamp: Date.now(),
      };

      for (const item of this.buffer) {
        if (item.errors) merged.errors?.push(...item.errors);
        if (item.metrics) merged.metrics?.push(...item.metrics);
        if (item.breadcrumbs) merged.breadcrumbs?.push(...item.breadcrumbs);
      }

      // Add Prometheus metrics if enabled
      if (this.config.enableMetrics) {
        const promMetrics = await this.metricsCollector.getMetricsAsJSON();
        const metricEvent: MetricEvent = {
          timestamp: Date.now(),
          metrics: this.promMetricsToObject(promMetrics),
          service: this.config.serviceName,
          tags: this.config.tags,
        };
        merged.metrics?.push(metricEvent);
      }

      // Clear buffer before sending (to allow new events during send)
      const toSend = { ...merged };
      this.buffer = [];

      // Send in batches
      const sendPromises: Promise<void>[] = [];
      if (toSend.errors && toSend.errors.length > 0) {
        sendPromises.push(this.sendBatch(toSend.errors, 'errors'));
      }
      if (toSend.metrics && toSend.metrics.length > 0) {
        sendPromises.push(this.sendBatch(toSend.metrics, 'metrics'));
      }
      if (toSend.breadcrumbs && toSend.breadcrumbs.length > 0) {
        sendPromises.push(this.sendBatch(toSend.breadcrumbs, 'breadcrumbs'));
      }

      await Promise.allSettled(sendPromises);
    } catch (error) {
      console.error('[RootSense] Error in flush:', error);
      // On error, buffer items were already cleared, but new events can be added
    } finally {
      this.isFlushing = false;
    }
  }

  private promMetricsToObject(metrics: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const metric of metrics) {
      if (metric.values && Array.isArray(metric.values)) {
        for (const value of metric.values) {
          const key = value.labels && Object.keys(value.labels).length > 0
            ? `${metric.name}_${Object.values(value.labels).join('_')}`
            : metric.name;
          result[key] = value.value;
        }
      }
    }
    return result;
  }

  private async sendBatch(data: ErrorEvent[] | MetricEvent[] | Breadcrumb[], type: string): Promise<void> {
    const url = `${this.config.apiUrl}/ingest/${type}`;
    const batches = this.chunkArray(data, this.config.batchSize);

    for (const batch of batches) {
      await this.sendWithRetry(url, batch);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async sendWithRetry(url: string, data: unknown): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - fail silently but log
    console.error(`[RootSense] Failed to send batch after ${this.config.retryAttempts} attempts:`, lastError);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

