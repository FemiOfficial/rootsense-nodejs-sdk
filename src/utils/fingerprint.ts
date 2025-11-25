import { createHash } from 'crypto';

export function generateFingerprint(type: string, service: string, endpoint?: string): string {
  const data = `${type}:${service}:${endpoint || ''}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

export function generateErrorId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

