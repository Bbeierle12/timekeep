import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium';
  const styles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-400',
    secondary: 'bg-slate-800 text-white hover:bg-slate-700',
    ghost: 'bg-transparent text-slate-200 hover:bg-slate-800'
  };

  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}
