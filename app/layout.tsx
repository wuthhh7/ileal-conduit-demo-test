import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  variable: '--font-noto-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ilieal Conduit Care',
  description: 'ระบบติดตามผู้ป่วยผ่าน LINE และ Dashboard สำหรับเจ้าหน้าที่',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body data-motion="on" className={`${inter.variable} ${notoSansThai.variable} antialiased`}>{children}</body>
    </html>
  );
}
