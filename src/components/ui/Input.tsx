import { InputHTMLAttributes, forwardRef } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { 
  label?: string;
};

const Input = forwardRef<HTMLInputElement, Props>(function Input({ 
  label, 
  className = '', 
  ...rest 
}, ref) {
  return (
    <label className="block">
      {label && <span className="block text-xs mb-1 text-gray-600">{label}</span>}
      <input 
        ref={ref} 
        className={`border rounded-lg w-full p-3 focus:ring-2 focus:ring-blue-500 ${className}`} 
        {...rest} 
      />
    </label>
  );
});

export default Input;