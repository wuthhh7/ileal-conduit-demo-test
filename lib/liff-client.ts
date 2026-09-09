'use client';

type LiffProfile = { userId: string; displayName: string };

type LiffApi = {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(config?: { redirectUri?: string }): void;
  getAccessToken(): string | null;
  getProfile(): Promise<LiffProfile>;
  closeWindow(): void;
};

declare global {
  interface Window {
    liff?: LiffApi;
  }
}

let loader: Promise<LiffApi> | null = null;

function loadLiff() {
  if (window.liff) return Promise.resolve(window.liff);
  if (loader) return loader;
  loader = new Promise<LiffApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.async = true;
    script.onload = () => window.liff ? resolve(window.liff) : reject(new Error('ไม่พบ LIFF SDK'));
    script.onerror = () => reject(new Error('โหลด LIFF ไม่สำเร็จ'));
    document.head.appendChild(script);
  });
  return loader;
}

export async function initializeLiff(liffId: string) {
  const liff = await loadLiff();
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return null;
  }
  const accessToken = liff.getAccessToken();
  if (!accessToken) throw new Error('ไม่สามารถยืนยันบัญชี LINE ได้');
  const profile = await liff.getProfile();
  return { accessToken, profile };
}

export function closeLiff() {
  if (window.liff) window.liff.closeWindow();
  else window.history.back();
}
