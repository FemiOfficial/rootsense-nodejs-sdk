import { RootSenseConfig } from '../types';

const DEFAULT_PII_FIELDS = [
  'password',
  'token',
  'authorization',
  'apiKey',
  'secret',
  'ssn',
  'creditCard',
  'email',
  'phone',
  'address',
  'credit_card',
  'api_key',
  'access_token',
  'refresh_token',
];

export function sanitizeValue(value: unknown, piiFields: string[]): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Check for email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return '[REDACTED_EMAIL]';
    }
    // Check for credit card pattern
    if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(value.replace(/\s/g, ''))) {
      return '[REDACTED_CARD]';
    }
    // Check for SSN pattern
    if (/^\d{3}-?\d{2}-?\d{4}$/.test(value)) {
      return '[REDACTED_SSN]';
    }
    return value;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, piiFields));
    }
    return sanitizeObject(value as Record<string, unknown>, piiFields);
  }

  return value;
}

export function sanitizeObject(
  obj: Record<string, unknown>,
  piiFields: string[] = DEFAULT_PII_FIELDS
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const lowerPiiFields = piiFields.map((f) => f.toLowerCase());

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key matches any PII field (case-insensitive)
    if (lowerPiiFields.some((piiField) => lowerKey.includes(piiField))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeValue(value, piiFields);
    } else {
      sanitized[key] = sanitizeValue(value, piiFields);
    }
  }

  return sanitized;
}

export function sanitizeHeaders(headers: Record<string, string | string[] | undefined>, config: RootSenseConfig): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const piiFields = config.piiFields || DEFAULT_PII_FIELDS;
  const lowerPiiFields = piiFields.map((f) => f.toLowerCase());

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (lowerPiiFields.some((piiField) => lowerKey.includes(piiField))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = Array.isArray(value) ? value.join(', ') : (value || '');
    }
  }

  return sanitized;
}

