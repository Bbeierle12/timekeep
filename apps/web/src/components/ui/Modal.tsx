import type { ReactNode } from 'react';

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
};

export default function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {onClose ? (
          <button className="text-slate-400 hover:text-slate-200" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
