'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandMark } from './brand-mark';
import styles from './dashboard.module.css';

export function DashboardLogin({
  onSuccess,
}: {
  onSuccess: () => void | Promise<void>;
}) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function login(event: {
    preventDefault(): void;
    currentTarget: HTMLFormElement;
  }) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    const usernameValue = formData.get('username');
    const passwordValue = formData.get('password');
    const username =
      typeof usernameValue === 'string' ? usernameValue.trim() : '';
    const password = typeof passwordValue === 'string' ? passwordValue : '';
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        await onSuccess();
      } else {
        setError(
          response.status === 401
            ? 'Username หรือ Password ไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง'
            : 'ยังเข้าสู่ระบบไม่ได้ กรุณาลองอีกครั้ง',
        );
      }
    } catch {
      setError('เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <form className={styles.loginCard} onSubmit={login}>
        <div className={styles.loginBrand}>
          <BrandMark
            className={`${styles.brandMark} ${styles.loginBrandMark}`}
          />
          <strong>Ilieal Conduit Care</strong>
        </div>
        <h1>เข้าสู่ระบบดูแลผู้ป่วย</h1>
        <span className={styles.loginHint}>
          <LockKeyhole aria-hidden="true" />
          ข้อมูลนี้สำหรับเจ้าหน้าที่ที่ได้รับอนุญาต
        </span>
        <label htmlFor="dashboard-username">
          Username
          <Input
            id="dashboard-username"
            name="username"
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Username"
            className="mt-2 h-12"
          />
        </label>
        <label htmlFor="dashboard-password">
          Password
          <Input
            id="dashboard-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="กรอกรหัสผ่าน"
            className="mt-2 h-12"
          />
        </label>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <Button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className={styles.primaryButton}
        >
          {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่แดชบอร์ด'}
        </Button>
      </form>
    </main>
  );
}
