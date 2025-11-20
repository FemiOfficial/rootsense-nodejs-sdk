export interface RootSenseConfig {
  dsn?: string;
  apiKey?: string;
  apiUrl?: string;
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
  sanitizePII?: boolean;
  piiFields?: string[];
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  tags?: Record<string, string>;
}

export interface ErrorEvent {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  stack?: string;
  fingerprint: string;
  service: string;
  endpoint?: string;
  method?: string;
  context?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface MetricEvent {
  timestamp: number;
  metrics: Record<string, number>;
  labels?: Record<string, string>;
  service: string;
  tags?: Record<string, string>;
}

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
  errors?: ErrorEvent[];
  metrics?: MetricEvent[];
  breadcrumbs?: Breadcrumb[];
  service: string;
  timestamp: number;
}

