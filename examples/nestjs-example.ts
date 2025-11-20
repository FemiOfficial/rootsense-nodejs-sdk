import { Module, Controller, Get, Post, UseInterceptors, Param, Body } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { init, RootSenseInterceptor } from '../src';

// Initialize RootSense SDK
const sdk = init({
  apiKey: 'YOUR_API_KEY',
  apiUrl: 'https://api.rootsense.ai/v1',
  serviceName: 'nestjs-example',
  environment: 'development',
  enableMetrics: true,
  enableErrorTracking: true,
});

@Controller()
@UseInterceptors(new RootSenseInterceptor(sdk))
export class AppController {
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return { id, name: 'John Doe' };
  }

  @Post('users')
  createUser(@Body() body: { email?: string }) {
    if (body.email === 'error@example.com') {
      throw new Error('Invalid email address');
    }
    return { id: 1, ...body };
  }

  @Get('error')
  getError() {
    throw new Error('This is a test error');
  }
}

@Module({
  controllers: [AppController],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('NestJS server running on port 3000');
}

bootstrap();

