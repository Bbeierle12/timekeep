import type { InputHTMLAttributes, ReactNode } from 'react';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
};

export default function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-200">
      <input type="checkbox" className={`h-4 w-4 ${className}`} {...props} />
      {label}
    </label>
  );
}
