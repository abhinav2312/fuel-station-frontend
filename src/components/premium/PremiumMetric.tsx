import React from 'react';

interface PremiumMetricProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  color?: 'green' | 'blue' | 'purple' | 'amber' | 'red' | 'indigo';
  className?: string;
}

export default function PremiumMetric({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  className = ''
}: PremiumMetricProps) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    indigo: 'text-indigo-600'
  };

  const bgColorClasses = {
    green: 'bg-green-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
    indigo: 'bg-indigo-100'
  };

  return (
    <div className={`premium-metric ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {icon && (
          <div className={`p-3 ${bgColorClasses[color]} rounded-xl`}>
            <span className={colorClasses[color]}>{icon}</span>
          </div>
        )}
        {trend && (
          <div className={`premium-badge ${
            trend.isPositive ? 'premium-badge-success' : 'premium-badge-error'
          }`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <div className={`premium-metric-value ${colorClasses[color]}`}>
        {value}
      </div>
      <div className="premium-metric-label">
        {title}
      </div>
      {subtitle && (
        <div className="premium-text-small text-slate-500 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}
