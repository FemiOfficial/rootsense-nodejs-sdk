import { sanitizeObject, sanitizeHeaders } from "../utils/pii";
import { RootSenseConfig } from "../types";

describe("PII Sanitization", () => {
  const config: RootSenseConfig = {
    piiFields: ["password", "token", "email", "authorization"],
  };

  describe("sanitizeObject", () => {
    it("should sanitize password fields", () => {
      const obj = {
        username: "john",
        password: "secret123",
      };
      const sanitized = sanitizeObject(obj, config.piiFields || []);
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.username).toBe("john");
    });

    it("should sanitize nested objects", () => {
      const obj = {
        user: {
          name: "John",
          password: "secret",
        },
      };
      const sanitized = sanitizeObject(obj, config.piiFields || []);
      expect((sanitized.user as Record<string, unknown>).password).toBe(
        "[REDACTED]"
      );
    });

    it("should sanitize arrays", () => {
      const obj = {
        users: [
          { name: "John", password: "secret1" },
          { name: "Jane", password: "secret2" },
        ],
      };
      const sanitized = sanitizeObject(obj, config.piiFields || []);
      expect(
        (sanitized.users as Array<Record<string, unknown>>)[0].password
      ).toBe("[REDACTED]");
    });
  });

  describe("sanitizeHeaders", () => {
    it("should sanitize authorization headers", () => {
      const headers = {
        authorization: "Bearer token123",
        "content-type": "application/json",
      };
      const sanitized = sanitizeHeaders(headers, config);
      expect(sanitized.authorization).toBe("[REDACTED]");
      expect(sanitized["content-type"]).toBe("application/json");
    });
  });
});
