import { ReactNode } from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
  valueColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-blue-100',
  trend,
  valueColor = 'text-gray-900',
}: StatCardProps) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={clsx('text-2xl font-bold mt-1', valueColor)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <div className={clsx(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend.value >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend.value).toFixed(1)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
