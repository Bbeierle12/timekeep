/**
 * Minimal iOS-26 device frame for previewing the employee cockpit screens
 * in a desktop browser. Ported from `design/handoff/ios-frame.jsx` —
 * only the outer shell (rounded corners, dynamic island, home indicator).
 *
 * No status bar / nav bar / keyboard: the cockpit screens render their
 * own chrome inside the frame.
 */
import * as React from 'react';

export interface IOSDeviceProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  /** When false (default), uses a light outer shell; cockpit screens keep their dark interior. */
  dark?: boolean;
}

export function IOSDevice({
  children,
  width = 390,
  height = 844,
  dark = false,
}: IOSDeviceProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 48,
        overflow: 'hidden',
        position: 'relative',
        background: dark ? '#000' : '#F2F2F7',
        boxShadow:
          '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Dynamic island */}
      <div
        style={{
          position: 'absolute',
          top: 11,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 126,
          height: 37,
          borderRadius: 24,
          background: '#000',
          zIndex: 50,
        }}
      />
      <div style={{ height: '100%' }}>{children}</div>
      {/* Home indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          height: 34,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingBottom: 8,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 139,
            height: 5,
            borderRadius: 100,
            background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
          }}
        />
      </div>
    </div>
  );
}
