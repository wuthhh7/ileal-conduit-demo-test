import { Clapperboard } from 'lucide-react';
import { PatientVideoLibrary } from '@/components/patient-video-library';

export default function ContentHubLiffPage() {
  return <main className="liff-page liff-content-page">
    <section className="liff-card liff-content-card" aria-labelledby="content-hub-title">
      <span className="liff-icon"><Clapperboard /></span>
      <h1 id="content-hub-title">วิดีโอให้ความรู้</h1>
      <p>เลือกชมวิดีโอเพื่อเรียนรู้การดูแลตนเอง</p>
      <PatientVideoLibrary/>
    </section>
  </main>;
}
