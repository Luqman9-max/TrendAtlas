'use client';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

export default function ScoreGauge({ score, size = 120, label = 'Score' }: ScoreGaugeProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  const color =
    score >= 70 ? '#10b981' :
    score >= 40 ? '#06b6d4' :
    '#64748b';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ animation: 'score-fill 1s ease-out' }}
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 origin-center"
          fill="var(--foreground)"
          fontSize={size * 0.25}
          fontWeight="700"
        >
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs text-text-muted font-medium">{label}</span>
    </div>
  );
}
