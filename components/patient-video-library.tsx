'use client';

import { Clock3, Eye, Play, Search } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoContent } from '@/lib/video-types';
import { youtubeId } from '@/lib/video-types';

export function PatientVideoLibrary() {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    void fetch('/api/content/views', { method: 'POST', keepalive: true }).catch(
      () => undefined,
    );
    fetch('/api/videos', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { videos: VideoContent[] }) => {
        if (active) setVideos(data.videos);
      })
      .catch(() => {
        if (active) setError('โหลดวิดีโอไม่สำเร็จ กรุณาลองใหม่');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const countView = useCallback(async (id: string) => {
    const response = await fetch(`/api/videos/${encodeURIComponent(id)}/view`, {
      method: 'POST',
    });
    if (!response.ok) return;
    const result = (await response.json()) as { views: number };
    setVideos((current) =>
      current.map((video) =>
        video.id === id ? { ...video, views: result.views } : video,
      ),
    );
  }, []);

  const filteredVideos = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('th');
    if (!normalized) return videos;
    return videos.filter((video) =>
      [video.title, video.description]
        .join(' ')
        .toLocaleLowerCase('th')
        .includes(normalized),
    );
  }, [query, videos]);

  if (loading)
    return (
      <div className="patient-video-loading">
        <i />
        <i />
      </div>
    );
  if (error) return <div className="patient-video-empty">{error}</div>;

  return (
    <div className="patient-video-library-shell">
      {videos.length > 0 && (
        <label className="patient-video-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อคลิปหรือรายละเอียด..."
            aria-label="ค้นหาคลิปวิดีโอ"
          />
        </label>
      )}
      {!videos.length ? (
        <div className="patient-video-empty">ยังไม่มีวิดีโอให้รับชม</div>
      ) : filteredVideos.length ? (
        <div className="patient-video-library">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} onView={countView} />
          ))}
        </div>
      ) : (
        <div className="patient-video-empty">
          ไม่พบคลิปที่ค้นหา <small>ลองใช้คำค้นหาอื่น</small>
        </div>
      )}
    </div>
  );
}

function VideoCard({
  video,
  onView,
}: {
  video: VideoContent;
  onView: (id: string) => Promise<void>;
}) {
  const [youtubeActive, setYoutubeActive] = useState(false);
  const viewed = useRef(false);
  const id = youtubeId(video.videoUrl);
  const poster =
    video.posterUrl || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');

  function registerView() {
    if (viewed.current) return;
    viewed.current = true;
    void onView(video.id);
  }

  return (
    <article className="patient-video">
      {id ? (
        youtubeActive ? (
          <iframe
            className="patient-video-frame"
            src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="patient-video-youtube"
            onClick={() => {
              registerView();
              setYoutubeActive(true);
            }}
            aria-label={`เล่นวิดีโอ ${video.title}`}
          >
            {poster && (
              <Image src={poster} alt="" width={640} height={360} unoptimized />
            )}
            <span>
              <Play fill="currentColor" />
            </span>
          </button>
        )
      ) : (
        // Captions depend on the video supplied by the administrator.
        // oxlint-disable-next-line jsx-a11y/media-has-caption
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster || undefined}
          aria-label={video.title}
          onPlay={registerView}
        >
          <source src={video.videoUrl} />
          เบราว์เซอร์นี้ไม่รองรับการเล่นวิดีโอ
        </video>
      )}
      <div className="patient-video-copy">
        <div className="patient-video-meta">
          {video.durationLabel && (
            <span className="patient-video-duration">
              <Clock3 /> {video.durationLabel}
            </span>
          )}
          <span className="patient-video-views">
            <Eye /> {video.views.toLocaleString('th-TH')} ครั้ง
          </span>
        </div>
        <h2>{video.title}</h2>
        {video.description && <p>{video.description}</p>}
      </div>
    </article>
  );
}
