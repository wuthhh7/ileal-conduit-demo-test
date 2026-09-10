'use client';

import { useState } from 'react';
import { HeartPulse, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from './dashboard.module.css';

export function DashboardLogin({ onSuccess }: { onSuccess: () => void | Promise<void> }) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function login(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    setSubmitting(true);
    const passwordValue = new FormData(event.currentTarget).get('password');
    const password = typeof passwordValue === 'string' ? passwordValue : '';
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    if (response.ok) {
      setError('');
      await onSuccess();
    } else {
      setError('รหัสผ่านไม่ถูกต้อง');
    }
    setSubmitting(false);
  }

  return <main className={styles.loginPage}>
    <form className={styles.loginCard} onSubmit={login}>
      <div className={styles.loginIcon}><HeartPulse/></div>
      <p>ระบบสำหรับทีมพยาบาล</p>
      <h1>เข้าสู่ระบบดูแลผู้ป่วย</h1>
      <span className={styles.loginHint}><LockKeyhole/>ข้อมูลนี้สำหรับเจ้าหน้าที่ที่ได้รับอนุญาต</span>
      <label htmlFor="dashboard-password">รหัสผ่านเจ้าหน้าที่<Input id="dashboard-password" name="password" type="password" required className="mt-2 h-12"/></label>
      {error && <div className={styles.error}>{error}</div>}
      <Button type="submit" disabled={submitting} className={styles.primaryButton}>{submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่แดชบอร์ด'}</Button>
    </form>
  </main>;
}
