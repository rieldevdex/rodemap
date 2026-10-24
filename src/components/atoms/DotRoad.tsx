import { useMemo } from 'react';
import './DotRoad.css';

const COLS = 64;
const ROWS = 9;
const STEP = 10;

/**
 * DotRoad (DESIGN.md §5): a field of dots bent along a wave, like a road seen from above; dots
 * near the middle of the road are larger. Drawn after Durves (dot matrix with wave amplitude and
 * frequency, exported as SVG). Decorative: aria-hidden and never behind text.
 */
export function DotRoad({ className }: { className?: string }) {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number }[] = [];
    for (let c = 0; c < COLS; c += 1) {
      const wave = Math.sin((c / COLS) * Math.PI * 2.2) * STEP * 1.6;
      for (let r = 0; r < ROWS; r += 1) {
        const fromMiddle = Math.abs(r - (ROWS - 1) / 2) / ((ROWS - 1) / 2);
        out.push({ x: c * STEP + STEP / 2, y: r * STEP + STEP / 2 + wave + STEP * 2, r: 1.1 + (1 - fromMiddle) * 1.9 });
      }
    }
    return out;
  }, []);
  return (
    <svg
      className={className ? `dot-road ${className}` : 'dot-road'}
      viewBox={`0 0 ${String(COLS * STEP)} ${String((ROWS + 4) * STEP)}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {dots.map((d) => (
        <circle key={`${String(d.x)}-${String(d.y)}`} cx={d.x} cy={d.y} r={d.r} />
      ))}
    </svg>
  );
}
