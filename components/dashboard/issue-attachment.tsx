'use client';

import Image from 'next/image';
import { Maximize2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './dashboard.module.css';

export function IssueAttachment({ src, alt }: { src: string; alt: string }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div className={styles.issueAttachment}>
        <button
          type="button"
          className={styles.issueAttachmentButton}
          onClick={() => setIsOpen(true)}
          aria-label="เปิดดูรูปประกอบขนาดใหญ่"
        >
          <Image src={src} alt={alt} width={190} height={132} unoptimized />
          <span>เปิดดูรูปประกอบ</span>
          <small>
            <Maximize2 />
            คลิกเพื่อขยายรูป
          </small>
        </button>
      </div>
      {isOpen &&
        createPortal(
          <div
            className={styles.imageViewerBackdrop}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <dialog
              open
              className={styles.imageViewer}
              aria-modal="true"
              aria-label="รูปประกอบจากผู้ป่วย"
            >
              <button
                type="button"
                className={styles.imageViewerClose}
                onClick={() => setIsOpen(false)}
                aria-label="ปิดรูป"
              >
                <X />
              </button>
              <div className={styles.imageViewerMedia}>
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 1080px) 100vw, 1080px"
                  unoptimized
                />
              </div>
              <p>รูปประกอบจากผู้ป่วย</p>
            </dialog>
          </div>,
          document.body,
        )}
    </>
  );
}
