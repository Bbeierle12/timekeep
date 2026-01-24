import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  children: ReactNode;
};

export default function Card({ title, children, className, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={[
        'rounded-xl border border-slate-800 bg-slate-900 p-5',
        className
      ].filter(Boolean).join(' ')}
    >
      {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}
