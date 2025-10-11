import { PropsWithChildren } from 'react';

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={`bg-white rounded-xl border shadow-sm ${className || ''}`}>{children}</div>;
}

export function CardHeader({ children }: PropsWithChildren) {
  return <div className="px-4 py-3 border-b font-semibold">{children}</div>;
}

export function CardBody({ children }: PropsWithChildren) {
  return <div className="p-4">{children}</div>;
}


