import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className="block text-sm text-slate-200">
      {label ? <span className="mb-1 block">{label}</span> : null}
      <input
        className={`w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 ${className}`}
        {...props}
      />
    </label>
  );
}
