import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Siriraj Urology Care',
  description: 'ระบบติดตามผู้ป่วยผ่าน LINE และ Dashboard สำหรับเจ้าหน้าที่',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
