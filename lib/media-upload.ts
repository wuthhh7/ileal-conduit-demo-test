import { MEDIA_LIMITS, type MediaKind } from './media-config';

function fileContentType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (
    (
      {
        mov: 'video/quicktime',
        mp4: 'video/mp4',
        m4v: 'video/x-m4v',
        webm: 'video/webm',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      } as Record<string, string>
    )[extension || ''] || ''
  );
}
async function uploadJson(body: Record<string, unknown>) {
  const response = await fetch('/api/videos/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'อัปโหลดไม่สำเร็จ');
  return result;
}
export async function discardMediaUpload(id: string) {
  await fetch(`/api/videos/upload?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
export async function uploadMedia(
  file: File,
  kind: MediaKind,
  progress: (percent: number) => void,
) {
  if (!file.size || file.size > MEDIA_LIMITS[kind])
    throw new Error(
      kind === 'video'
        ? 'คลิปต้องมีขนาดไม่เกิน 250 MB'
        : 'รูปหน้าปกต้องมีขนาดไม่เกิน 8 MB',
    );
  const upload = (await uploadJson({
    action: 'init',
    kind,
    name: file.name,
    size: file.size,
    contentType: fileContentType(file),
  })) as { id: string; chunkSize: number; chunkCount: number };
  try {
    for (let index = 0; index < upload.chunkCount; index += 1) {
      const chunk = file.slice(
        index * upload.chunkSize,
        (index + 1) * upload.chunkSize,
      );
      for (let attempt = 0; ; attempt += 1) {
        try {
          const response = await fetch(
            `/api/videos/upload/${upload.id}/${index}`,
            {
              method: 'PUT',
              headers: { 'content-type': 'application/octet-stream' },
              body: chunk,
            },
          );
          if (response.ok) break;
          const result = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          if (response.status < 500 && response.status !== 429)
            throw new UploadRejected(result.error || 'อัปโหลดไม่สำเร็จ');
          throw new Error(result.error || 'การเชื่อมต่อขัดข้อง');
        } catch (error) {
          if (error instanceof UploadRejected || attempt >= 2) throw error;
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * (attempt + 1)),
          );
        }
      }
      progress(Math.round(((index + 1) / upload.chunkCount) * 100));
    }
    return (await uploadJson({ action: 'complete', id: upload.id })) as {
      id: string;
      url: string;
    };
  } catch (error) {
    await discardMediaUpload(upload.id).catch(() => undefined);
    throw error;
  }
}
class UploadRejected extends Error {}
