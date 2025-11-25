import { generateFingerprint, generateErrorId } from '../utils/fingerprint';

describe('Fingerprint Generation', () => {
  describe('generateFingerprint', () => {
    it('should generate consistent fingerprints for same input', () => {
      const fp1 = generateFingerprint('Error', 'service', '/endpoint');
      const fp2 = generateFingerprint('Error', 'service', '/endpoint');
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprints for different inputs', () => {
      const fp1 = generateFingerprint('Error', 'service1', '/endpoint');
      const fp2 = generateFingerprint('Error', 'service2', '/endpoint');
      expect(fp1).not.toBe(fp2);
    });

    it('should handle missing endpoint', () => {
      const fp = generateFingerprint('Error', 'service');
      expect(fp).toBeDefined();
      expect(fp.length).toBe(16);
    });
  });

  describe('generateErrorId', () => {
    it('should generate unique error IDs', () => {
      const id1 = generateErrorId();
      const id2 = generateErrorId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with timestamp', () => {
      const id = generateErrorId();
      expect(id).toMatch(/^\d+-/);
    });
  });
});

