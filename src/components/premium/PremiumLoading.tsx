import React from 'react';

interface PremiumLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export default function PremiumLoading({
  size = 'md',
  text,
  className = ''
}: PremiumLoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-3">
        <div className={`premium-loading ${sizeClasses[size]}`}></div>
        {text && (
          <p className="premium-text-small text-slate-600">{text}</p>
        )}
      </div>
    </div>
  );
}

export function PremiumLoadingOverlay({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="premium-card">
        <div className="premium-card-body text-center">
          <PremiumLoading size="lg" text={text} />
        </div>
      </div>
    </div>
  );
}
