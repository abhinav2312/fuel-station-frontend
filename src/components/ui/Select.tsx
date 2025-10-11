import { SelectHTMLAttributes, PropsWithChildren, forwardRef } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

const Select = forwardRef<HTMLSelectElement, Props>(function Select({ label, className = '', children, ...rest }, ref) {
  return (
    <label className="block">
      {label && <span className="block text-xs mb-1 text-gray-600">{label}</span>}
      <select ref={ref} className={`border rounded-lg w-full p-3 focus:ring-2 focus:ring-blue-500 ${className}`} {...rest}>
        {children}
      </select>
    </label>
  );
});

export default Select;


