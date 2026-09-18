export type VideoContent = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  posterUrl: string | null;
  durationLabel: string | null;
  views: number;
  sortOrder: number;
  createdAt: string;
};

export function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}
