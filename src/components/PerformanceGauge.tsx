import React from 'react';
import { motion } from 'motion/react';

interface GaugeProps {
  value: number;
}

export const PerformanceGauge: React.FC<GaugeProps> = ({ value }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * (circumference / 2);

  return (
    <div className="relative flex flex-col items-center justify-center w-32 h-20 overflow-hidden">
      <svg className="w-full h-full transform -rotate-180" viewBox="0 0 100 60">
        {/* Background Track */}
        <path
          d="M 15 50 A 35 35 0 0 1 85 50"
          fill="none"
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress Track */}
        <motion.path
          d="M 15 50 A 35 35 0 0 1 85 50"
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute top-8 text-center">
        <span className="text-xl font-black text-slate-800">{value}%</span>
      </div>
    </div>
  );
};
