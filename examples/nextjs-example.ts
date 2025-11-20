// pages/api/health.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { init, nextjsMiddleware } from 'rootsense-nodejs-sdk';

const sdk = init({
  apiKey: 'YOUR_API_KEY',
  apiUrl: 'https://api.rootsense.ai/v1',
  serviceName: 'nextjs-example',
  environment: 'production',
  enableMetrics: true,
  enableErrorTracking: true,
});

export default nextjsMiddleware(sdk)(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

// pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { init, nextjsMiddleware } from 'rootsense-nodejs-sdk';

const sdk = init({
  apiKey: 'YOUR_API_KEY',
  apiUrl: 'https://api.rootsense.ai/v1',
  serviceName: 'nextjs-example',
});

export default nextjsMiddleware(sdk)(async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  res.status(200).json({ id, name: 'John Doe' });
});

