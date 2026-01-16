import { forwardRef, useId, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const hasError = !!error;

    return (
      <div className="block text-sm">
        {label && (
          <label htmlFor={id} className="mb-1 block font-medium text-slate-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full rounded-md border bg-slate-900 px-3 py-2.5 text-slate-100
            placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
