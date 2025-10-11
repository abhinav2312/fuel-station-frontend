import React from 'react';

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export default function PremiumCard({
  children,
  className = '',
  hover = true,
  glass = false
}: PremiumCardProps) {
  const baseClasses = 'premium-card';
  const hoverClasses = hover ? 'hover:transform hover:-translate-y-1' : '';
  const glassClasses = glass ? 'glass' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${glassClasses} ${className}`}>
      {children}
    </div>
  );
}

export function PremiumCardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`premium-card-header ${className}`}>
      {children}
    </div>
  );
}

export function PremiumCardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`premium-card-body ${className}`}>
      {children}
    </div>
  );
}
