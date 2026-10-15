import { serveMedia } from '@/lib/media-serving';

// Next.js development fallback; Netlify Edge serves this path in production.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return serveMedia(request, (await context.params).id);
}
export const HEAD = GET;
