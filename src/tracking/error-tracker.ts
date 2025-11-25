import {
  RootSenseConfig,
  ErrorEvent,
  RequestContext,
  ResponseContext,
  Breadcrumb,
} from "../types";
import { generateFingerprint, generateErrorId } from "../utils/fingerprint";
import { sanitizeObject, sanitizeHeaders } from "../utils/pii";

export class ErrorTracker {
  private config: Required<RootSenseConfig>;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number = 100;

  constructor(config: Required<RootSenseConfig>) {
    this.config = config;
  }

  captureError(
    error: Error,
    context?: {
      request?: RequestContext;
      response?: ResponseContext;
      additional?: Record<string, unknown>;
    }
  ): ErrorEvent {
    const errorType = error.constructor.name || "Error";
    const endpoint = context?.request?.path || "unknown";
    const fingerprint = generateFingerprint(
      errorType,
      this.config.serviceName,
      endpoint
    );

    const sanitizedContext = this.sanitizeContext(context);

    const errorEvent: ErrorEvent = {
      event_id: generateErrorId(),
      timestamp: new Date().toISOString(),
      type: 'error',
      exception_type: errorType,
      message: error.message,
      stack_trace: error.stack || '',
      fingerprint,
      environment: this.config.environment,
      project_id: this.config.projectId,
      service: this.config.serviceName,
      endpoint,
      method: context?.request?.method,
      status_code: context?.response?.statusCode,
      tags: {
        ...this.config.tags,
        environment: this.config.environment,
        version: this.config.version,
      },
      extra: sanitizedContext,
      breadcrumbs: this.breadcrumbs.length > 0 ? [...this.breadcrumbs] : undefined,
    };

    return errorEvent;
  }

  private sanitizeContext(context?: {
    request?: RequestContext;
    response?: ResponseContext;
    additional?: Record<string, unknown>;
  }): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    if (context?.request) {
      sanitized.request = {
        method: context.request.method,
        path: context.request.path,
        headers: this.config.sanitizePII
          ? sanitizeHeaders(context.request.headers || {}, this.config)
          : context.request.headers,
        query: this.config.sanitizePII
          ? sanitizeObject(
              context.request.query || {},
              this.config.piiFields || []
            )
          : context.request.query,
        params: context.request.params,
        ip: context.request.ip,
        userAgent: context.request.userAgent,
        body: this.config.sanitizePII
          ? sanitizeObject(
              (context.request.body as Record<string, unknown>) || {},
              this.config.piiFields || []
            )
          : context.request.body,
      };
    }

    if (context?.response) {
      sanitized.response = {
        statusCode: context.response.statusCode,
        headers: this.config.sanitizePII
          ? sanitizeHeaders(context.response.headers || {}, this.config)
          : context.response.headers,
        duration: context.response.duration,
        body:
          this.config.sanitizePII && context.response.body
            ? sanitizeObject(
                context.response.body as Record<string, unknown>,
                this.config.piiFields || []
              )
            : context.response.body,
      };
    }

    if (context?.additional) {
      sanitized.additional = this.config.sanitizePII
        ? sanitizeObject(context.additional, this.config.piiFields || [])
        : context.additional;
    }

    return sanitized;
  }

  addBreadcrumb(
    message: string,
    category: string = "custom",
    level: "info" | "warning" | "error" | "debug" = "info",
    data?: Record<string, unknown>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      type: "log",
      category,
      message,
      data:
        this.config.sanitizePII && data
          ? sanitizeObject(data, this.config.piiFields || [])
          : data,
      level,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }
}
