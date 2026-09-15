'use client';

import Image from 'next/image';
import { useState } from 'react';

export function PatientAvatar({ name, avatarUrl, className }: { name: string; avatarUrl: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!avatarUrl || failed) return <span className={className}>{name.charAt(0) || '?'}</span>;
  return <Image src={avatarUrl} alt="" width={64} height={64} unoptimized className={className} referrerPolicy="no-referrer" onError={() => setFailed(true)}/>;
}
