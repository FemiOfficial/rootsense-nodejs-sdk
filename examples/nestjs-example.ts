import {
  Module,
  Controller,
  Get,
  Post,
  UseInterceptors,
  Param,
  Body,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { init, RootSenseInterceptor } from "../src";

/**
 * NestJS Example with OpenTelemetry Auto-Instrumentation
 *
 * This example demonstrates automatic instrumentation of:
 * - NestJS/Express HTTP requests/responses
 * - Database queries (PostgreSQL, MySQL, MongoDB)
 * - External API calls
 *
 * Install required packages:
 * npm install @nestjs/core @nestjs/common @nestjs/platform-express
 * npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation
 * npm install @opentelemetry/instrumentation-express @opentelemetry/instrumentation-http
 *
 * For database instrumentation:
 * - PostgreSQL: npm install @opentelemetry/instrumentation-pg @nestjs/typeorm typeorm pg
 * - MySQL: npm install @opentelemetry/instrumentation-mysql2 @nestjs/typeorm typeorm mysql2
 * - MongoDB: npm install @opentelemetry/instrumentation-mongodb @nestjs/mongoose mongoose
 */

// Initialize RootSense SDK with auto-instrumentation
// OpenTelemetry will automatically instrument NestJS (via Express) and any installed databases
const sdk = init({
  apiKey: "YOUR_API_KEY",
  apiUrl: "https://api.rootsense.ai/v1",
  projectId: "YOUR_PROJECT_ID", // Required
  serviceName: "nestjs-example",
  environment: "development",
  enableAutoInstrumentation: true, // Enabled by default
  enableMetrics: true,
  enableErrorTracking: true,
});

@Controller()
@UseInterceptors(new RootSenseInterceptor(sdk))
export class AppController {
  @Get("health")
  getHealth() {
    return { status: "ok" };
  }

  @Get("users/:id")
  getUser(@Param("id") id: string) {
    return { id, name: "John Doe" };
  }

  @Post("users")
  createUser(@Body() body: { email?: string }) {
    if (body.email === "error@example.com") {
      throw new Error("Invalid email address");
    }
    return { id: 1, ...body };
  }

  @Get("error")
  getError() {
    throw new Error("This is a test error");
  }
}

@Module({
  controllers: [AppController],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log("NestJS server running on port 3000");
  console.log("OpenTelemetry auto-instrumentation is active");
}

bootstrap();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await sdk.shutdown();
  process.exit(0);
});
