import type { ReactNode } from 'react';

type CardProps = {
  title?: string;
  children: ReactNode;
};

export default function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}
