import { scoreTone } from "@/components/ui";

const COLORS = { good: "var(--color-good)", warn: "var(--color-warn)", bad: "var(--color-danger)" };

/** Circular progress indicator for the ATS score. */
export function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const stroke = size / 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = COLORS[scoreTone(score)];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`ATS score ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease, stroke 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display font-semibold leading-none text-ink ${size >= 90 ? "text-3xl" : "text-xl"}`}>{score}</span>
        {size >= 90 ? <span className="mt-1 text-xs text-muted">of 100</span> : null}
      </div>
    </div>
  );
}
