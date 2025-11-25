import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { RootSenseSpanExporter, RootSenseMetricExporter } from './exporters';
import { ErrorTracker } from '../tracking/error-tracker';
import { BatchSender } from '../transport/batch-sender';
import { RootSenseConfig } from '../types';

/**
 * Automatic instrumentation setup using OpenTelemetry.
 * Enables instrumentation for various Node.js frameworks and libraries.
 */
export class AutoInstrumentation {
  private errorTracker: ErrorTracker;
  private batchSender: BatchSender;
  private config: Required<RootSenseConfig>;
  private tracerProvider?: NodeTracerProvider;
  private meterProvider?: MeterProvider;
  private initialized: boolean = false;

  constructor(
    errorTracker: ErrorTracker,
    batchSender: BatchSender,
    config: Required<RootSenseConfig>
  ) {
    this.errorTracker = errorTracker;
    this.batchSender = batchSender;
    this.config = config;
  }

  initialize(): boolean {
    if (this.initialized) {
      console.debug('[RootSense] Auto-instrumentation already initialized');
      return true;
    }

    try {
      // Create resource with service information
      const resource = Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.config.version,
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
          'rootsense.project_id': this.config.projectId,
        })
      );

      // Setup tracing
      const spanExporter = new RootSenseSpanExporter(
        this.errorTracker,
        this.batchSender,
        {
          projectId: this.config.projectId,
          environment: this.config.environment,
        }
      );

      this.tracerProvider = new NodeTracerProvider({
        resource,
      });

      this.tracerProvider.addSpanProcessor(new BatchSpanProcessor(spanExporter));
      this.tracerProvider.register();

      // Setup metrics
      const metricExporter = new RootSenseMetricExporter(this.batchSender, {
        projectId: this.config.projectId,
        environment: this.config.environment,
      });

      const metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60000, // 1 minute
      });

      this.meterProvider = new MeterProvider({
        resource,
        readers: [metricReader],
      });

      // Enable auto-instrumentation for installed frameworks
      this._enableAutoInstrumentation();

      this.initialized = true;
      console.log('[RootSense] OpenTelemetry auto-instrumentation initialized');
      return true;
    } catch (error) {
      console.error('[RootSense] Failed to initialize auto-instrumentation:', error);
      return false;
    }
  }

  private _enableAutoInstrumentation(): void {
    const instrumentors: string[] = [];

    // Express
    try {
      const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new ExpressInstrumentation()],
      });
      instrumentors.push('Express');
    } catch (e) {
      // Express not installed or instrumentation not available
    }

    // HTTP/HTTPS
    try {
      const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new HttpInstrumentation()],
      });
      instrumentors.push('HTTP');
    } catch (e) {
      // HTTP instrumentation not available
    }

    // Fastify
    try {
      const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new FastifyInstrumentation()],
      });
      instrumentors.push('Fastify');
    } catch (e) {
      // Fastify not installed or instrumentation not available
    }

    // Koa
    try {
      const { KoaInstrumentation } = require('@opentelemetry/instrumentation-koa');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new KoaInstrumentation()],
      });
      instrumentors.push('Koa');
    } catch (e) {
      // Koa not installed or instrumentation not available
    }

    // NestJS (via Express)
    try {
      const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new ExpressInstrumentation()],
      });
      if (!instrumentors.includes('Express')) {
        instrumentors.push('NestJS');
      }
    } catch (e) {
      // NestJS/Express instrumentation not available
    }

    // Next.js (via HTTP)
    try {
      const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new HttpInstrumentation()],
      });
      if (!instrumentors.includes('HTTP')) {
        instrumentors.push('Next.js');
      }
    } catch (e) {
      // Next.js/HTTP instrumentation not available
    }

    // PostgreSQL
    try {
      const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new PgInstrumentation()],
      });
      instrumentors.push('PostgreSQL');
    } catch (e) {
      // PostgreSQL not installed or instrumentation not available
    }

    // MySQL
    try {
      const { MySQL2Instrumentation } = require('@opentelemetry/instrumentation-mysql2');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new MySQL2Instrumentation()],
      });
      instrumentors.push('MySQL');
    } catch (e) {
      // MySQL not installed or instrumentation not available
    }

    // MongoDB
    try {
      const { MongoDBInstrumentation } = require('@opentelemetry/instrumentation-mongodb');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new MongoDBInstrumentation()],
      });
      instrumentors.push('MongoDB');
    } catch (e) {
      // MongoDB not installed or instrumentation not available
    }

    // Redis
    try {
      const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new RedisInstrumentation()],
      });
      instrumentors.push('Redis');
    } catch (e) {
      // Redis not installed or instrumentation not available
    }

    // Fetch API
    try {
      const { FetchInstrumentation } = require('@opentelemetry/instrumentation-fetch');
      const { registerInstrumentations } = require('@opentelemetry/instrumentation');
      registerInstrumentations({
        instrumentations: [new FetchInstrumentation()],
      });
      instrumentors.push('Fetch');
    } catch (e) {
      // Fetch instrumentation not available
    }

    if (instrumentors.length > 0) {
      console.log(`[RootSense] Auto-instrumentation enabled for: ${instrumentors.join(', ')}`);
    } else {
      console.log('[RootSense] No frameworks detected for auto-instrumentation');
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Shutdown meter provider first to ensure all metrics are exported
      // before shutting down the tracer provider
      if (this.meterProvider) {
        await this.meterProvider.shutdown();
      }

      // Shutdown tracer provider
      if (this.tracerProvider) {
        await this.tracerProvider.shutdown();
      }

      console.log('[RootSense] Auto-instrumentation shutdown complete');
    } catch (error) {
      console.error('[RootSense] Error during auto-instrumentation shutdown:', error);
    } finally {
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

