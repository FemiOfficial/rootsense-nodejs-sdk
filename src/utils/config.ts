import { RootSenseConfig } from '../types';

const DEFAULT_CONFIG: Required<Omit<RootSenseConfig, 'dsn' | 'apiKey' | 'apiUrl' | 'websocketUrl'>> = {
  serviceName: 'unknown-service',
  environment: 'production',
  version: '1.0.0',
  maxBufferSize: 1000,
  flushInterval: 5000, // 5 seconds
  batchSize: 100,
  enableWebSocket: false,
  enableMetrics: true,
  enableErrorTracking: true,
  sanitizePII: true,
  piiFields: ['password', 'token', 'authorization', 'apiKey', 'secret', 'ssn', 'creditCard', 'email'],
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 10000,
  tags: {},
};

export function parseDSN(dsn: string): { apiKey: string; apiUrl: string } {
  // Format: https://API_KEY@api.rootsense.ai/v1/...
  const match = dsn.match(/^https?:\/\/([^@]+)@(.+)$/);
  if (!match) {
    throw new Error('Invalid DSN format. Expected: https://API_KEY@api.rootsense.ai/v1/...');
  }
  return {
    apiKey: match[1],
    apiUrl: `https://${match[2]}`,
  };
}

export function normalizeConfig(config: RootSenseConfig): Required<RootSenseConfig> {
  let apiKey: string;
  let apiUrl: string;

  if (config.dsn) {
    const parsed = parseDSN(config.dsn);
    apiKey = parsed.apiKey;
    apiUrl = parsed.apiUrl;
  } else {
    apiKey = config.apiKey || '';
    apiUrl = config.apiUrl || 'https://api.rootsense.ai/v1';
  }

  if (!apiKey) {
    throw new Error('API key is required. Provide either dsn or apiKey in config.');
  }

  return {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey,
    apiUrl,
    websocketUrl: config.websocketUrl || apiUrl.replace(/^https?/, 'ws'),
    serviceName: config.serviceName || DEFAULT_CONFIG.serviceName,
  };
}

