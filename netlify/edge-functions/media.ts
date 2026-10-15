import type { Config, Context } from '@netlify/edge-functions';
import { serveMedia } from '../../lib/media-serving.ts';

// This narrow route streams large videos outside the serverless response-size limit.
export default function media(request: Request, context: Context) {
  return serveMedia(request, context.params.id);
}
export const config: Config = { path: '/media/:id', cache: 'manual' };
