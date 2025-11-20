import Fastify from 'fastify';
import { init, fastifyPlugin } from '../src';

const fastify = Fastify({ logger: true });

// Initialize RootSense SDK
const sdk = init({
  apiKey: 'YOUR_API_KEY',
  apiUrl: 'https://api.rootsense.ai/v1',
  serviceName: 'fastify-example',
  environment: 'development',
  enableMetrics: true,
  enableErrorTracking: true,
});

// Register RootSense plugin
fastify.register(fastifyPlugin(sdk));

// Example routes
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  return { id, name: 'John Doe' };
});

fastify.post('/users', async (request, reply) => {
  const body = request.body as { email?: string };
  if (body.email === 'error@example.com') {
    throw new Error('Invalid email address');
  }
  return { id: 1, ...body };
});

fastify.get('/error', async () => {
  throw new Error('This is a test error');
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Fastify server running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

