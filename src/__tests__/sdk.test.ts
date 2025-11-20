import { RootSenseSDK, init } from '../core/sdk';
import { RootSenseConfig } from '../types';

describe('RootSenseSDK', () => {
  let sdk: RootSenseSDK;
  const mockConfig: RootSenseConfig = {
    apiKey: 'test-api-key',
    apiUrl: 'https://api.rootsense.ai/v1',
    serviceName: 'test-service',
    environment: 'test',
    enableMetrics: true,
    enableErrorTracking: true,
  };

  beforeEach(() => {
    sdk = init(mockConfig);
  });

  afterEach(async () => {
    await sdk.shutdown();
  });

  describe('initialization', () => {
    it('should initialize SDK with config', () => {
      expect(sdk.isInitialized()).toBe(true);
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        init({} as RootSenseConfig);
      }).toThrow('API key is required');
    });

    it('should parse DSN correctly', () => {
      const sdkWithDSN = init({
        dsn: 'https://test-key@api.rootsense.ai/v1',
        serviceName: 'test',
      });
      expect(sdkWithDSN.isInitialized()).toBe(true);
      sdkWithDSN.shutdown();
    });
  });

  describe('error tracking', () => {
    it('should capture errors', () => {
      const error = new Error('Test error');
      expect(() => {
        sdk.captureError(error);
      }).not.toThrow();
    });

    it('should capture errors with context', () => {
      const error = new Error('Test error');
      sdk.captureError(error, {
        request: {
          method: 'GET',
          path: '/test',
        },
      });
      expect(sdk.isInitialized()).toBe(true);
    });
  });

  describe('metrics', () => {
    it('should record requests', () => {
      expect(() => {
        sdk.recordRequest('GET', '/test', 200, 100);
      }).not.toThrow();
    });
  });

  describe('breadcrumbs', () => {
    it('should add breadcrumbs', () => {
      expect(() => {
        sdk.addBreadcrumb('Test message', 'test', 'info');
      }).not.toThrow();
    });
  });
});

