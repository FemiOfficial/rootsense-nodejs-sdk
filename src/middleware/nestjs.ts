import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RootSenseSDK } from '../core/sdk';
import { RequestContext, ResponseContext } from '../types';

@Injectable()
export class RootSenseInterceptor implements NestInterceptor {
  constructor(private sdk: RootSenseSDK) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const requestContext: RequestContext = {
      method: request.method,
      path: request.url,
      headers: request.headers as Record<string, string>,
      query: request.query as Record<string, unknown>,
      params: request.params,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      body: request.body,
    };

    this.sdk.getMetricsCollector().incrementActiveRequests();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const responseContext: ResponseContext = {
          statusCode: response.statusCode,
          headers: response.getHeaders() as Record<string, string>,
          duration,
        };

        this.sdk.recordRequest(request.method, request.url, response.statusCode, duration);

        if (response.statusCode >= 400) {
          const error = new Error(`HTTP ${response.statusCode}: ${request.method} ${request.url}`);
          this.sdk.captureError(error, {
            request: requestContext,
            response: responseContext,
          });
        }

        this.sdk.getMetricsCollector().decrementActiveRequests();
      }),
      catchError((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.sdk.captureError(err, { request: requestContext });
        this.sdk.getMetricsCollector().decrementActiveRequests();
        return throwError(() => error);
      })
    );
  }
}

