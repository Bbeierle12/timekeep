import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const styles = {
    primary: 'bg-sky-500 text-white hover:bg-sky-400 focus:ring-sky-500 disabled:bg-sky-500/50',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 disabled:bg-slate-700/50',
    ghost: 'bg-transparent text-slate-200 hover:bg-slate-800 focus:ring-slate-500 disabled:text-slate-500',
    danger: 'bg-red-500 text-white hover:bg-red-400 focus:ring-red-500 disabled:bg-red-500/50'
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${styles[variant]} disabled:cursor-not-allowed ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
