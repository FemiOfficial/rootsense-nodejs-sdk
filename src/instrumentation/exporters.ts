import {
  SpanExporter,
  ReadableSpan,
  SpanExportResult,
} from '@opentelemetry/sdk-trace-base';
import {
  MetricExporter,
  MetricExportResult,
  ExportResultCode,
} from '@opentelemetry/sdk-metrics';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { RootSenseEvent, SpanEvent, MetricEvent, SpanStatus, SpanEventData, SpanError, MetricDataPoint } from '../types';
import { ErrorTracker } from '../tracking/error-tracker';
import { BatchSender } from '../transport/batch-sender';

/**
 * Custom OpenTelemetry span exporter for RootSense.
 * Converts OTel spans to RootSense event format and tracks auto-resolution.
 */
export class RootSenseSpanExporter implements SpanExporter {
  private errorTracker: ErrorTracker;
  private batchSender: BatchSender;
  private config: { projectId: string; environment: string };

  constructor(errorTracker: ErrorTracker, batchSender: BatchSender, config: { projectId: string; environment: string }) {
    this.errorTracker = errorTracker;
    this.batchSender = batchSender;
    this.config = config;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: SpanExportResult) => void
  ): void {
    try {
      const events: RootSenseEvent[] = [];

      for (const span of spans) {
        const event = this._convertSpanToEvent(span);
        if (event) {
          events.push(event);

          // Track auto-resolution for successful operations
          if (span.status.code === 1) { // OK status
            this._trackSuccess(span);
          }
        }
      }

      // Send events via batch sender
      if (events.length > 0) {
        for (const event of events) {
          this.batchSender.addEvent(event);
        }
      }

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      console.error('[RootSense] Error exporting spans:', error);
      resultCallback({ code: ExportResultCode.FAILURE });
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  private _convertSpanToEvent(span: ReadableSpan): SpanEvent | null {
    const attributes = span.attributes || {};

    // Determine operation type from span attributes
    const operationType = this._determineOperationType(span.name, attributes);

    // Only create events for errors or important operations
    const isError = span.status.code !== 1; // Not OK
    const isImportant = ['http', 'db', 'redis', 'celery', 'messaging'].includes(operationType);

    if (!isError && !isImportant) {
      return null;
    }

    // Build status object
    const status: SpanStatus = {
      code: span.status.code === 0 ? 'UNSET' : span.status.code === 1 ? 'OK' : 'ERROR',
    };
    if (span.status.message) {
      status.description = span.status.message;
    }

    // Build span events list
    const spanEvents: SpanEventData[] = [];
    if (span.events) {
      for (const e of span.events) {
        spanEvents.push({
          name: e.name,
          timestamp: e.time[0] * 1e9 + e.time[1], // Convert to nanoseconds
          attributes: e.attributes || {},
        });
      }
    }

    const event: SpanEvent = {
      event_id: this._generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'span',
      operation_type: operationType as SpanEvent['operation_type'],
      name: span.name,
      trace_id: span.spanContext().traceId,
      span_id: span.spanContext().spanId,
      is_error: isError,
      environment: this.config.environment,
      project_id: this.config.projectId,
    };

    // Add optional fields
    if (span.parentSpanId) {
      event.parent_span_id = span.parentSpanId;
    }
    if (span.startTime) {
      event.start_time = span.startTime[0] * 1e9 + span.startTime[1];
    }
    if (span.endTime) {
      event.end_time = span.endTime[0] * 1e9 + span.endTime[1];
    }
    if (span.endTime && span.startTime) {
      const startNs = span.startTime[0] * 1e9 + span.startTime[1];
      const endNs = span.endTime[0] * 1e9 + span.endTime[1];
      event.duration_ns = endNs - startNs;
    }
    if (status) {
      event.status = status;
    }
    if (Object.keys(attributes).length > 0) {
      event.attributes = attributes;
    }
    if (spanEvents.length > 0) {
      event.events = spanEvents;
    }

    // Add error details if present
    if (isError && span.events) {
      for (const eventObj of span.events) {
        if (eventObj.name === 'exception') {
          const attrs = eventObj.attributes || {};
          const error: SpanError = {};
          if (attrs['exception.type']) {
            error.type = String(attrs['exception.type']);
          }
          if (attrs['exception.message']) {
            error.message = String(attrs['exception.message']);
          }
          if (attrs['exception.stacktrace']) {
            error.stacktrace = String(attrs['exception.stacktrace']);
          }
          if (Object.keys(error).length > 0) {
            event.error = error;
          }
        }
      }
    }

    return event;
  }

  private _determineOperationType(spanName: string, attributes: Record<string, unknown>): string {
    // Check HTTP
    if ('http.method' in attributes || 'http.url' in attributes) {
      return 'http';
    }

    // Check DB
    if ('db.system' in attributes || 'db.statement' in attributes) {
      return 'db';
    }

    // Check Redis
    if ('db.system' in attributes && attributes['db.system'] === 'redis') {
      return 'redis';
    }

    // Check Celery
    if ('celery.task_name' in attributes) {
      return 'celery';
    }

    // Check messaging
    if ('messaging.system' in attributes) {
      return 'messaging';
    }

    return 'generic';
  }

  private _trackSuccess(span: ReadableSpan): void {
    const attributes = span.attributes || {};
    const operationType = this._determineOperationType(span.name, attributes);

    // Generate fingerprint based on operation type
    const fingerprint = this._generateFingerprint(operationType, span.name, attributes);

    // Build context
    const context = {
      operation_type: operationType,
      operation_name: span.name,
      attributes,
    };

    // Send success signal for auto-resolution (fire and forget)
    this.batchSender.sendSuccessSignal(fingerprint, context).catch((err) => {
      console.debug('[RootSense] Error sending success signal:', err);
    });
  }

  private _generateFingerprint(operationType: string, name: string, attributes: Record<string, unknown>): string {
    if (operationType === 'http') {
      const method = String(attributes['http.method'] || 'UNKNOWN');
      const route = String(attributes['http.route'] || attributes['http.target'] || name);
      return `http:${method}:${route}`;
    } else if (operationType === 'db') {
      const dbSystem = String(attributes['db.system'] || 'unknown');
      const operation = name.split(' ')[0] || 'query';
      const table = String(attributes['db.sql.table'] || 'unknown');
      return `db:${dbSystem}:${operation}:${table}`;
    } else if (operationType === 'redis') {
      const command = String(attributes['db.operation'] || name);
      return `redis:${command}`;
    } else if (operationType === 'celery') {
      const taskName = String(attributes['celery.task_name'] || name);
      return `celery:${taskName}`;
    } else {
      return `${operationType}:${name}`;
    }
  }

  private _generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Custom OpenTelemetry metric exporter for RootSense.
 * Converts OTel metrics to RootSense event format.
 */
export class RootSenseMetricExporter implements MetricExporter {
  private batchSender: BatchSender;
  private config: { projectId: string; environment: string };

  constructor(batchSender: BatchSender, config: { projectId: string; environment: string }) {
    this.batchSender = batchSender;
    this.config = config;
  }

  export(
    metrics: ResourceMetrics,
    resultCallback: (result: MetricExportResult) => void
  ): void {
    try {
      const events: RootSenseEvent[] = [];

      for (const scopeMetrics of metrics.scopeMetrics) {
        for (const metric of scopeMetrics.metrics) {
          const event = this._convertMetricToEvent(metric, metrics.resource);
          if (event) {
            events.push(event);
          }
        }
      }

      // Send events via batch sender
      if (events.length > 0) {
        for (const event of events) {
          this.batchSender.addEvent(event);
        }
      }

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      console.error('[RootSense] Error exporting metrics:', error);
      resultCallback({ code: ExportResultCode.FAILURE });
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  private _convertMetricToEvent(metric: any, resource: any): MetricEvent | null {
    // Extract resource attributes
    const resourceAttrs: Record<string, unknown> = {};
    if (resource && resource.attributes) {
      for (const [key, value] of Object.entries(resource.attributes)) {
        resourceAttrs[key] = value;
      }
    }

    const event: MetricEvent = {
      event_id: this._generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'metric',
      metric_name: metric.descriptor.name,
      name: metric.descriptor.name,
      environment: this.config.environment,
      project_id: this.config.projectId,
    };

    // Add optional metric fields
    if (metric.descriptor.description) {
      event.description = metric.descriptor.description;
    }
    if (metric.descriptor.unit) {
      event.unit = metric.descriptor.unit;
    }
    if (Object.keys(resourceAttrs).length > 0) {
      event.resource = resourceAttrs;
    }

    // Convert data points based on metric type
    const dataPoints: MetricDataPoint[] = [];
    
    // Handle different metric types
    if (metric.dataPoints) {
      for (const dataPoint of metric.dataPoints) {
        const dp: MetricDataPoint = {
          attributes: dataPoint.attributes || {},
        };

        // Add timestamp fields
        if (dataPoint.startTime) {
          dp.start_time_unix_nano = dataPoint.startTime[0] * 1e9 + dataPoint.startTime[1];
        }
        if (dataPoint.endTime) {
          dp.time_unix_nano = dataPoint.endTime[0] * 1e9 + dataPoint.endTime[1];
        }

        // Add value based on metric type
        if (dataPoint.value !== undefined) {
          dp.value = dataPoint.value;
        } else if (dataPoint.sum !== undefined) {
          dp.sum = dataPoint.sum;
          if (dataPoint.count !== undefined) {
            dp.count = dataPoint.count;
          }
          if (dataPoint.min !== undefined) {
            dp.min = dataPoint.min;
          }
          if (dataPoint.max !== undefined) {
            dp.max = dataPoint.max;
          }
        }

        dataPoints.push(dp);
      }
    }

    if (dataPoints.length > 0) {
      event.data_points = dataPoints;
    }

    return event;
  }

  private _generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

