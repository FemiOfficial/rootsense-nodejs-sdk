import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { init, koaMiddleware } from '../src';

const app = new Koa();
const router = new Router();

// Initialize RootSense SDK
const sdk = init({
  apiKey: 'YOUR_API_KEY',
  apiUrl: 'https://api.rootsense.ai/v1',
  serviceName: 'koa-example',
  environment: 'development',
  enableMetrics: true,
  enableErrorTracking: true,
});

// Use RootSense middleware
app.use(koaMiddleware(sdk));
app.use(bodyParser());

// Example routes
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

router.get('/users/:id', (ctx) => {
  const id = ctx.params.id;
  ctx.body = { id, name: 'John Doe' };
});

router.post('/users', (ctx) => {
  const body = ctx.request.body as { email?: string };
  if (body.email === 'error@example.com') {
    throw new Error('Invalid email address');
  }
  ctx.body = { id: 1, ...body };
});

router.get('/error', () => {
  throw new Error('This is a test error');
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Koa server running on port ${PORT}`);
});

