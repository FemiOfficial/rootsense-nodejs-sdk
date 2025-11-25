import { Request, Response, NextFunction } from 'express';
import { RootSenseSDK } from '../core/sdk';
import { RequestContext, ResponseContext } from '../types';

export function expressMiddleware(sdk: RootSenseSDK) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestContext: RequestContext = {
      method: req.method,
      path: req.path,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, unknown>,
      params: req.params,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      body: req.body,
    };

    // Increment active requests
    sdk.getMetricsCollector().incrementActiveRequests();

    // Capture response
    const originalSend = res.send;
    res.send = function (body?: unknown) {
      const duration = Date.now() - startTime;
      const responseContext: ResponseContext = {
        statusCode: res.statusCode,
        headers: res.getHeaders() as Record<string, string>,
        duration,
        body,
      };

      // Record metrics
      sdk.recordRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration
      );

      // Capture errors for 4xx/5xx responses
      if (res.statusCode >= 400) {
        const error = new Error(`HTTP ${res.statusCode}: ${req.method} ${req.path}`);
        sdk.captureError(error, {
          request: requestContext,
          response: responseContext,
        });
      }

      // Decrement active requests
      sdk.getMetricsCollector().decrementActiveRequests();

      return originalSend.call(this, body);
    };

    // Error handler
    res.on('finish', () => {
      // Already handled in res.send override
    });

    next();
  };
}

export function expressErrorHandler(sdk: RootSenseSDK) {
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestContext: RequestContext = {
      method: req.method,
      path: req.path,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, unknown>,
      params: req.params,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      body: req.body,
    };

    sdk.captureError(err, { request: requestContext });

    // Pass to next error handler if exists
    next(err);
  };
}

