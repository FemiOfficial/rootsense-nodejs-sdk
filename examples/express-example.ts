import express from 'express';
import { init, expressMiddleware, expressErrorHandler } from '../src';

const app = express();
app.use(express.json());

// Initialize RootSense SDK
const sdk = init({
  dsn: 'https://YOUR_API_KEY@api.rootsense.ai/v1',
  serviceName: 'express-example',
  environment: 'development',
  version: '1.0.0',
  enableMetrics: true,
  enableErrorTracking: true,
  sanitizePII: true,
});

// Use RootSense middleware
app.use(expressMiddleware(sdk));

// Example routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId, name: 'John Doe' });
});

app.post('/users', (req, res) => {
  // Simulate error
  if (req.body.email === 'error@example.com') {
    throw new Error('Invalid email address');
  }
  res.json({ id: 1, ...req.body });
});

app.get('/error', (req, res, next) => {
  next(new Error('This is a test error'));
});

// Error handler (should be last)
app.use(expressErrorHandler(sdk));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

