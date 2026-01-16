import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import SignaturePadLib from 'signature_pad';

export type SignaturePadRef = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
};

type SignaturePadProps = {
  width?: number;
  height?: number;
  onEnd?: () => void;
  className?: string;
};

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ width = 400, height = 150, onEnd, className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signaturePadRef = useRef<SignaturePadLib | null>(null);

    useEffect(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;

      // Handle high DPI displays
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);

      signaturePadRef.current = new SignaturePadLib(canvas, {
        backgroundColor: 'rgb(15, 23, 42)', // slate-900
        penColor: 'rgb(226, 232, 240)' // slate-200
      });

      if (onEnd) {
        signaturePadRef.current.addEventListener('endStroke', onEnd);
      }

      return () => {
        if (signaturePadRef.current && onEnd) {
          signaturePadRef.current.removeEventListener('endStroke', onEnd);
        }
        signaturePadRef.current?.off();
      };
    }, [width, height, onEnd]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        signaturePadRef.current?.clear();
      },
      isEmpty: () => {
        return signaturePadRef.current?.isEmpty() ?? true;
      },
      toDataURL: () => {
        return signaturePadRef.current?.toDataURL() ?? '';
      }
    }));

    return (
      <div className={`relative ${className}`}>
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-slate-700 bg-slate-900 touch-none"
          style={{ width, height }}
        />
        <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-slate-500 pointer-events-none">
          Sign above
        </p>
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
