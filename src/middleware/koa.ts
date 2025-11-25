import { Context, Middleware } from 'koa';
import { RootSenseSDK } from '../core/sdk';
import { RequestContext, ResponseContext } from '../types';

export function koaMiddleware(sdk: RootSenseSDK): Middleware {
  return async (ctx: Context, next: () => Promise<unknown>): Promise<void> => {
    const startTime = Date.now();
    const requestContext: RequestContext = {
      method: ctx.method,
      path: ctx.path,
      headers: ctx.headers as Record<string, string>,
      query: ctx.query as Record<string, unknown>,
      params: ctx.params,
      ip: ctx.ip,
      userAgent: ctx.get('user-agent'),
      body: ctx.request.body,
    };

    sdk.getMetricsCollector().incrementActiveRequests();

    try {
      await next();

      const duration = Date.now() - startTime;
      const responseContext: ResponseContext = {
        statusCode: ctx.status,
        headers: ctx.response.headers as Record<string, string>,
        duration,
        body: ctx.body,
      };

      sdk.recordRequest(ctx.method, ctx.path, ctx.status, duration);

      if (ctx.status >= 400) {
        const error = new Error(`HTTP ${ctx.status}: ${ctx.method} ${ctx.path}`);
        sdk.captureError(error, {
          request: requestContext,
          response: responseContext,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      sdk.captureError(error, { request: requestContext });
      throw err;
    } finally {
      sdk.getMetricsCollector().decrementActiveRequests();
    }
  };
}

