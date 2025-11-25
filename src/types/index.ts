export interface RootSenseConfig {
  dsn?: string;
  apiKey?: string;
  apiUrl?: string;
  projectId?: string;
  serviceName?: string;
  environment?: string;
  version?: string;
  maxBufferSize?: number;
  flushInterval?: number;
  batchSize?: number;
  enableWebSocket?: boolean;
  websocketUrl?: string;
  enableMetrics?: boolean;
  enableErrorTracking?: boolean;
  enableAutoInstrumentation?: boolean;
  sanitizePII?: boolean;
  piiFields?: string[];
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  tags?: Record<string, string>;
}

// Base event fields common to all event types
export interface BaseEvent {
  event_id: string;
  timestamp: string; // ISO format datetime string
  type: 'error' | 'message' | 'metric' | 'span';
  environment: string;
  project_id: string;
  tags?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  user?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
}

// Error event structure (matching Python SDK)
export interface ErrorEvent extends BaseEvent {
  type: 'error';
  exception_type: string;
  message: string;
  stack_trace: string;
  fingerprint: string;
  service?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  request_id?: string;
  trace_id?: string;
  span_id?: string;
}

// Message event structure (matching Python SDK)
export interface MessageEvent extends BaseEvent {
  type: 'message';
  level: 'info' | 'warning' | 'error' | 'debug' | 'critical';
  message: string;
  category?: string;
  logger?: string;
  module?: string;
  function?: string;
  line_number?: number;
}

// Metric data point structure
export interface MetricDataPoint {
  attributes?: Record<string, unknown>;
  value?: number;
  sum?: number;
  count?: number;
  min?: number;
  max?: number;
  start_time_unix_nano?: number;
  time_unix_nano?: number;
}

// Metric event structure (matching Python SDK)
export interface MetricEvent extends BaseEvent {
  type: 'metric';
  metric_name: string;
  name?: string; // Alternative name field (used by OTel exporter)
  description?: string;
  unit?: string;
  metric_type?: 'counter' | 'gauge' | 'histogram' | 'summary';
  sample_name?: string; // Full sample name with suffix
  labels?: Record<string, string>; // Prometheus-style labels
  value?: number; // Single value (Prometheus-style)
  time_unix_nano?: number; // Timestamp in nanoseconds (Prometheus-style)
  resource?: Record<string, unknown>; // Resource attributes
  data_points?: MetricDataPoint[]; // OTel-style data points
}

// Span status structure
export interface SpanStatus {
  code: string;
  description?: string;
}

// Span event data structure
export interface SpanEventData {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

// Span error details structure
export interface SpanError {
  type?: string;
  message?: string;
  stacktrace?: string;
}

// Span event structure (matching Python SDK)
export interface SpanEvent extends BaseEvent {
  type: 'span';
  operation_type: 'http' | 'db' | 'redis' | 'celery' | 'messaging' | 'generic';
  name: string;
  trace_id: string;
  span_id: string;
  is_error: boolean;
  parent_span_id?: string;
  start_time?: number;
  end_time?: number;
  duration_ns?: number;
  status?: SpanStatus;
  attributes?: Record<string, unknown>;
  events?: SpanEventData[]; // Span events (not RootSense events)
  error?: SpanError;
}

// Union type for all event types
export type RootSenseEvent = ErrorEvent | MessageEvent | MetricEvent | SpanEvent;

export interface RequestContext {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface ResponseContext {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
  duration?: number;
}

export interface Breadcrumb {
  timestamp: number;
  type: string;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  level?: 'info' | 'warning' | 'error' | 'debug';
}

export interface BatchPayload {
  events: RootSenseEvent[];
}

