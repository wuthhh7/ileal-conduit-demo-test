export const MEDIA_STORE = 'patient-education-media';
// Below the Netlify Functions binary payload limit, including encoding overhead.
export const MEDIA_CHUNK_SIZE = 3 * 1024 * 1024;
export const MEDIA_LIMITS = {
  video: 250 * 1024 * 1024,
  poster: 8 * 1024 * 1024,
};
export const MEDIA_TYPES = {
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'],
  poster: ['image/jpeg', 'image/png', 'image/webp'],
};
export type MediaKind = keyof typeof MEDIA_LIMITS;
export const MEDIA_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export type MediaManifest = {
  version: 1;
  id: string;
  kind: MediaKind;
  name: string;
  contentType: string;
  size: number;
  chunkSize: number;
  chunkCount: number;
  createdAt: string;
};
export function mediaIdFromUrl(value: string) {
  const match = value.match(/^\/media\/([^/?#]+)$/);
  return match && MEDIA_ID.test(match[1]) ? match[1] : null;
}
