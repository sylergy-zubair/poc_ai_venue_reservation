import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import type { InputProps } from '../../types';

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  error,
  disabled = false,
  required = false,
  className,
  children,
  ...props
}, ref) => {
  const baseClasses = 'block w-full rounded-lg shadow-sm transition-colors sm:text-sm placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';
  
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
        required={required}
        className={clsx(baseClasses, stateClasses, className)}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;