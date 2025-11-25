import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { RootSenseSDK } from '../core/sdk';
import { RequestContext, ResponseContext } from '../types';

export function fastifyPlugin(sdk: RootSenseSDK) {
  return async function (fastify: FastifyInstance): Promise<void> {
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();
      (request as any).rootsenseStartTime = startTime;
      sdk.getMetricsCollector().incrementActiveRequests();
    });

    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = (request as any).rootsenseStartTime || Date.now();
      const duration = Date.now() - startTime;

      const requestContext: RequestContext = {
        method: request.method,
        path: request.url,
        headers: request.headers as Record<string, string>,
        query: request.query as Record<string, unknown>,
        params: request.params as Record<string, unknown>,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        body: request.body as unknown,
      };

      const responseContext: ResponseContext = {
        statusCode: reply.statusCode,
        headers: reply.getHeaders() as Record<string, string>,
        duration,
      };

      sdk.recordRequest(request.method, request.url, reply.statusCode, duration);

      if (reply.statusCode >= 400) {
        const error = new Error(`HTTP ${reply.statusCode}: ${request.method} ${request.url}`);
        sdk.captureError(error, {
          request: requestContext,
          response: responseContext,
        });
      }

      sdk.getMetricsCollector().decrementActiveRequests();
    });

    fastify.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      const requestContext: RequestContext = {
        method: request.method,
        path: request.url,
        headers: request.headers as Record<string, string>,
        query: request.query as Record<string, unknown>,
        params: request.params as Record<string, unknown>,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        body: request.body as unknown,
      };

      sdk.captureError(error, { request: requestContext });
      reply.send(error);
    });
  };
}

