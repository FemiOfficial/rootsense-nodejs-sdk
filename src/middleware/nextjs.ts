import { NextApiRequest, NextApiResponse } from 'next';
import { RootSenseSDK } from '../core/sdk';
import { RequestContext, ResponseContext } from '../types';

export function nextjsMiddleware(sdk: RootSenseSDK) {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) => {
    return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
      const startTime = Date.now();
      const requestContext: RequestContext = {
        method: req.method,
        path: req.url,
        headers: req.headers as Record<string, string>,
        query: req.query as Record<string, unknown>,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        body: req.body,
      };

      sdk.getMetricsCollector().incrementActiveRequests();

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = function (chunk?: unknown, encoding?: unknown) {
        const duration = Date.now() - startTime;
        const responseContext: ResponseContext = {
          statusCode: res.statusCode,
          headers: res.getHeaders() as Record<string, string>,
          duration,
        };

        sdk.recordRequest(req.method || 'GET', req.url || '/', res.statusCode, duration);

        if (res.statusCode >= 400) {
          const error = new Error(`HTTP ${res.statusCode}: ${req.method} ${req.url}`);
          sdk.captureError(error, {
            request: requestContext,
            response: responseContext,
          });
        }

        sdk.getMetricsCollector().decrementActiveRequests();
        return originalEnd.call(this, chunk, encoding);
      };

      try {
        await handler(req, res);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        sdk.captureError(err, { request: requestContext });
        throw error;
      }
    };
  };
}

