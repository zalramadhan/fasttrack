"use client";

import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const visibleRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mq.matches) return;

    setEnabled(true);
    document.documentElement.classList.add('has-custom-cursor');

    const handleMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }

      const target = e.target as HTMLElement | null;
      const interactive = Boolean(
        target?.closest('a, button, input, select, textarea, summary, [role="button"]')
      );
      setIsInteractive((prev) => (prev === interactive ? prev : interactive));
    };

    const handleLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const handleEnter = () => {
      visibleRef.current = true;
      setVisible(true);
    };
    const handleDown = () => setIsPressed(true);
    const handleUp = () => setIsPressed(false);

    window.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className={`pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1 -translate-y-1 transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ willChange: 'transform' }}
    >
      <div
        className={`transition-transform duration-150 ease-out ${
          isPressed ? 'scale-85' : isInteractive ? 'scale-105' : 'scale-100'
        }`}
      >
        {isInteractive ? (
          /* Pointing Hand Cursor (interactive hover) */
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
          >
            <path
              d="M10.5 3.2C10.5 2.1 11.4 1.2 12.5 1.2C13.6 1.2 14.5 2.1 14.5 3.2V11.2H15.8C16.7 11.2 17.5 11.9 17.6 12.8L18 12.5C18.9 11.9 20.1 12.2 20.7 13.1C20.9 13.4 21 13.8 21 14.2V14.5C21.9 14.4 22.8 15 23 15.9C23.3 17.2 23.1 20.4 21.8 22.6C20.9 24.1 19.3 25 17.5 25H12.2C10.1 25 8.3 23.8 7.3 22L4.7 17.1C4.1 16.1 4.5 14.8 5.5 14.2C6.4 13.7 7.6 14 8.2 14.9L10.5 17.8V3.2Z"
              fill="#F4F5F1"
              stroke="#101110"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <rect
              x="10.2"
              y="22.8"
              width="9.2"
              height="2.6"
              rx="1.3"
              fill="#C3F36B"
              stroke="#101110"
              strokeWidth="1.2"
            />
          </svg>
        ) : (
          /* Open Studio Hand Cursor (default) */
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
          >
            <path
              d="M9.5 12.5V5.2C9.5 4.2 10.3 3.4 11.3 3.4C12.3 3.4 13.1 4.2 13.1 5.2V11.2M13.1 11.2V3.8C13.1 2.8 13.9 2 14.9 2C15.9 2 16.7 2.8 16.7 3.8V11.4M16.7 11.4V5.4C16.7 4.4 17.5 3.6 18.5 3.6C19.5 3.6 20.3 4.4 20.3 5.4V13.4M20.3 13.4V8.8C20.3 7.9 21 7.2 21.9 7.2C22.8 7.2 23.5 7.9 23.5 8.8V16.6C23.5 21.1 20.3 24.8 15.8 24.8H13.5C10.5 24.8 8 23.1 6.7 20.5L4.5 16.1C4 15.1 4.4 13.9 5.4 13.4C6.3 12.9 7.5 13.3 8 14.2L9.5 16.6V12.5Z"
              fill="#F4F5F1"
              stroke="#101110"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="10.4"
              y="22.6"
              width="9.4"
              height="2.5"
              rx="1.25"
              fill="#C3F36B"
              stroke="#101110"
              strokeWidth="1.2"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
