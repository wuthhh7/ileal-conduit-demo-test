import { handleUpload } from '@vercel/blob/client';
import { isDashboardAuthorized } from '@/lib/dashboard-auth';

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  if (!(await isDashboardAuthorized(request))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });

  try {
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const isVideo = pathname.startsWith('videos/');
        const isPoster = pathname.startsWith('posters/');
        if (!isVideo && !isPoster) throw new Error('ไม่อนุญาตให้ใช้โฟลเดอร์นี้');

        return {
          allowedContentTypes: isVideo ? VIDEO_TYPES : IMAGE_TYPES,
          maximumSizeInBytes: isVideo ? 250 * 1024 * 1024 : 8 * 1024 * 1024,
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
        };
      },
    });
    return Response.json(response);
  } catch (error) {
    console.error('Video upload token error', error);
    return Response.json({ error: 'ไม่สามารถเตรียมพื้นที่อัปโหลดได้' }, { status: 500 });
  }
}
