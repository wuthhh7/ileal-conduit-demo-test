'use client';

import { Clapperboard, Eye, FileImage, FileVideo, Plus, Trash2 } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import type { VideoContent } from '@/lib/video-types';
import { youtubeId } from '@/lib/video-types';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import styles from './dashboard.module.css';

const emptyForm = { title: '', description: '', videoFile: null as File | null, posterFile: null as File | null, durationLabel: '', durationSeconds: 0 };

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, '0')} นาที`;
}

function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { URL.revokeObjectURL(source); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(source); reject(new Error('อ่านระยะเวลาคลิปไม่ได้')); };
    video.src = source;
  });
}

function createRandomPoster(file: File, durationSeconds: number) {
  return new Promise<Blob>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(source);
      video.removeAttribute('src');
      video.load();
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => fail('สร้างหน้าปกจากวิดีโอไม่ได้ กรุณาลองเลือกคลิปอื่น');
    video.onloadedmetadata = () => {
      const actualDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationSeconds;
      if (!Number.isFinite(actualDuration) || actualDuration <= 0) {
        fail('อ่านระยะเวลาคลิปเพื่อสร้างหน้าปกไม่ได้');
        return;
      }

      const start = Math.min(actualDuration * 0.15, Math.max(actualDuration - 0.2, 0));
      const end = Math.max(start, Math.min(actualDuration * 0.85, Math.max(actualDuration - 0.05, 0)));
      video.onseeked = () => {
        if (settled) return;
        if (!video.videoWidth || !video.videoHeight) {
          fail('อ่านภาพจากวิดีโอเพื่อสร้างหน้าปกไม่ได้');
          return;
        }

        const scale = Math.min(1, 1280 / video.videoWidth);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          fail('เบราว์เซอร์ไม่รองรับการสร้างหน้าปกอัตโนมัติ');
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) {
            fail('สร้างไฟล์หน้าปกไม่สำเร็จ');
            return;
          }
          settled = true;
          cleanup();
          resolve(blob);
        }, 'image/jpeg', 0.84);
      };
      video.currentTime = start + Math.random() * (end - start);
    };
    video.src = source;
  });
}

function safeFileName(name: string) {
  const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${crypto.randomUUID()}.${extension}`;
}

export function VideoManager() {
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const auth = await fetch('/api/dashboard', { cache: 'no-store' });
      if (auth.status === 401) {
        setNeedsLogin(true);
        return;
      }
      const response = await fetch('/api/videos', { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      const data = await response.json() as { videos: VideoContent[] };
      setVideos(data.videos);
      setNeedsLogin(false);
      setError('');
    } catch {
      setError('โหลดรายการคลิปไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const totalViews = useMemo(() => videos.reduce((sum, video) => sum + video.views, 0), [videos]);

  async function addVideo(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!form.videoFile) throw new Error('กรุณาเลือกไฟล์วิดีโอ');
      if (!form.durationLabel || !form.durationSeconds) throw new Error('ไม่สามารถอ่านระยะเวลาจากไฟล์วิดีโอได้');
      let generatedPoster: Blob | null = null;
      if (!form.posterFile) {
        setNotice('กำลังสุ่มหน้าปกจากคลิป…');
        generatedPoster = await createRandomPoster(form.videoFile, form.durationSeconds);
      }
      setNotice('กำลังอัปโหลดไฟล์วิดีโอ…');
      const video = await upload(`videos/${safeFileName(form.videoFile.name)}`, form.videoFile, {
        access: 'public', handleUploadUrl: '/api/videos/upload', multipart: true, clientPayload: 'video',
      });
      let posterUrl = '';
      if (form.posterFile || generatedPoster) {
        setNotice('กำลังอัปโหลดรูปหน้าปก…');
        const posterFile = form.posterFile || new File([generatedPoster as Blob], `${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' });
        const poster = await upload(`posters/${safeFileName(posterFile.name)}`, posterFile, {
          access: 'public', handleUploadUrl: '/api/videos/upload', clientPayload: 'poster',
        });
        posterUrl = poster.url;
      }
      const response = await fetch('/api/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: form.title, description: form.description, videoUrl: video.url, posterUrl, durationLabel: form.durationLabel }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 401) { setNeedsLogin(true); return; }
      if (!response.ok) throw new Error(result.error || 'เพิ่มคลิปไม่สำเร็จ');
      formElement.reset();
      setForm(emptyForm);
      setNotice('เพิ่มคลิปเรียบร้อยแล้ว คลิปจะแสดงใน LINE ทันที');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เพิ่มคลิปไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function removeVideo(video: VideoContent) {
    if (!window.confirm(`ลบคลิป “${video.title}” หรือไม่`)) return;
    setDeletingId(video.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/videos/${encodeURIComponent(video.id)}`, { method: 'DELETE' });
      if (response.status === 401) { setNeedsLogin(true); return; }
      if (!response.ok) throw new Error('ลบคลิปไม่สำเร็จ');
      setVideos((current) => current.filter((item) => item.id !== video.id));
      setNotice('ลบคลิปออกจากหน้า LINE แล้ว');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ลบคลิปไม่สำเร็จ');
    } finally {
      setDeletingId('');
    }
  }

  if (needsLogin) return <DashboardLogin onSuccess={load}/>;
  return <DashboardShell title="จัดการคลิปวิดีโอ" description="เพิ่มหรือลบคลิปสำหรับผู้ป่วย และติดตามยอดเปิดดู" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    {notice && <div className={styles.videoNotice}>{notice}</div>}
    <section className={styles.videoSummary}>
      <article><span><Clapperboard/></span><div><small>คลิปทั้งหมด</small><strong>{videos.length}</strong><p>รายการที่แสดงใน LINE</p></div></article>
      <article><span><Eye/></span><div><small>ยอดดูรวม</small><strong>{totalViews.toLocaleString('th-TH')}</strong><p>นับเมื่อผู้ป่วยกดเล่นคลิป</p></div></article>
    </section>

    <section className={styles.videoAdminGrid}>
      <form className={styles.videoFormPanel} onSubmit={addVideo}>
        <header><span><Plus/></span><div><h2>เพิ่มคลิปใหม่</h2><p>อัปโหลดไฟล์วิดีโอและรูปหน้าปกได้จากเครื่อง</p></div></header>
        <label><span>ชื่อคลิป *</span><input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="เช่น วิธีดูแลถุงรองรับปัสสาวะ"/></label>
        <label><span>คำอธิบาย</span><textarea maxLength={500} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="อธิบายสั้น ๆ ว่าคลิปนี้สอนเรื่องอะไร"/></label>
        <label className={styles.videoFileField}><span><FileVideo/>ไฟล์วิดีโอ *</span><input required type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={async (event) => {
          const file = event.currentTarget.files?.[0] || null;
          if (!file) return;
          setError('');
          try { const duration = await readVideoDuration(file); setForm((current) => ({ ...current, videoFile: file, durationLabel: formatDuration(duration), durationSeconds: duration })); }
          catch { setForm((current) => ({ ...current, videoFile: file, durationLabel: '', durationSeconds: 0 })); setError('ไฟล์นี้ไม่สามารถอ่านระยะเวลาได้ กรุณาเลือกไฟล์วิดีโออื่น'); }
        }}/><small>{form.videoFile ? `${form.videoFile.name} · ${form.durationLabel || 'กำลังอ่านระยะเวลา…'}` : 'แนะนำให้ใช้ไฟล์ MOV เพื่อให้ขนาดไฟล์ไม่ใหญ่เกินไป (สูงสุด 250 MB)'}</small></label>
        <label className={styles.videoFileField}><span><FileImage/>รูปหน้าปก (เว้นว่างได้)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm((current) => ({ ...current, posterFile: event.currentTarget.files?.[0] || null }))}/><small>{form.posterFile ? form.posterFile.name : 'เว้นว่างได้ — ระบบจะสุ่มภาพจากคลิปให้อัตโนมัติ'}</small></label>
        <button type="submit" disabled={saving}><Plus/>{saving ? 'กำลังเพิ่มคลิป…' : 'เพิ่มคลิปวิดีโอ'}</button>
      </form>

      <section className={styles.videoListPanel}>
        <header><div><h2>คลิปที่แสดงใน LINE</h2><p>ยอดดูอัปเดตเมื่อผู้ป่วยเริ่มเล่นวิดีโอ</p></div><b>{videos.length} คลิป</b></header>
        {loading ? <div className={styles.loadingRows}><i/><i/><i/></div> : videos.length ? <div className={styles.videoAdminList}>
          {videos.map((video) => <AdminVideoRow key={video.id} video={video} deleting={deletingId === video.id} onDelete={() => void removeVideo(video)}/>) }
        </div> : <div className={styles.empty}><Clapperboard/><h2>ยังไม่มีคลิปวิดีโอ</h2><p>เพิ่มคลิปแรกจากแบบฟอร์มด้านข้าง</p></div>}
      </section>
    </section>
  </DashboardShell>;
}

function AdminVideoRow({ video, deleting, onDelete }: { video: VideoContent; deleting: boolean; onDelete: () => void }) {
  const id = youtubeId(video.videoUrl);
  const poster = video.posterUrl || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
  return <article className={styles.videoAdminRow}>
    <div className={styles.videoAdminThumb}>{poster ? <Image src={poster} alt="" width={160} height={96} unoptimized/> : <Clapperboard/>}</div>
    <div className={styles.videoAdminCopy}><h3>{video.title}</h3>{video.description && <p>{video.description}</p>}<div><span><Eye/>{video.views.toLocaleString('th-TH')} ครั้ง</span>{video.durationLabel && <span>{video.durationLabel}</span>}<span>{id ? 'YouTube' : 'วิดีโอ'}</span></div></div>
    <button type="button" className={styles.videoDelete} onClick={onDelete} disabled={deleting} aria-label={`ลบคลิป ${video.title}`}><Trash2/>{deleting ? 'กำลังลบ…' : 'ลบ'}</button>
  </article>;
}
