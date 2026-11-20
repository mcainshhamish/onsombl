import { useState, type ReactNode } from 'react';

// Validated categorical order (fixed: colour follows the entity, never its rank).
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const INK = '#1b2433';
// Text inside a coloured block: white on the darker hues, near-black on the light ones.
const onFill = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? INK : '#ffffff';
};

type Tip = { x: number; y: number; title: string; value: string; color?: string } | null;

/** One shared tooltip: value leads, label follows, series keyed by a short stroke. */
export function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const show = (e: { clientX: number; clientY: number }, title: string, value: string, color?: string) =>
    setTip({ x: e.clientX, y: e.clientY, title, value, color });
  const hide = () => setTip(null);
  const node: ReactNode = tip && (
    <div className="viz-tip" style={{ left: tip.x + 12, top: tip.y + 14 }} role="status">
      <strong>{tip.value}</strong>
      <span>
        {tip.color && <i style={{ background: tip.color }} />}
        {tip.title}
      </span>
    </div>
  );
  return { show, hide, node };
}

/** Tiny trend line for stat tiles. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i * (w - 8)) / (values.length - 1) + 4, h - 4 - ((v - min) / span) * (h - 10)] as const);
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={line} fill="none" stroke="#b7c3d9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="4" fill={SERIES[0]} stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/** One whole split into parts, at a glance. Share printed inside blocks that fit. */
export function Segmented({ parts, unit = '%', legend = true }: { parts: { label: string; value: number; detail?: string }[]; unit?: string; legend?: boolean }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const { show, hide, node } = useTip();
  return (
    <div className="seg-wrap">
      <div className="seg" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}${unit}`).join(', ')}>
        {parts.map((p, i) => {
          const share = (p.value / total) * 100;
          const c = SERIES[i % SERIES.length];
          return (
            <div
              key={p.label}
              className="seg-block"
              style={{ width: `${share}%`, background: c, color: onFill(c) }}
              tabIndex={0}
              onPointerMove={(e) => show(e, p.detail ?? p.label, `${p.label} · ${p.value}${unit}`, c)}
              onPointerLeave={hide}
              onFocus={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                show({ clientX: r.left, clientY: r.top }, p.detail ?? p.label, `${p.label} · ${p.value}${unit}`, c);
              }}
              onBlur={hide}
            >
              {share >= 11 ? `${Math.round(share)}%` : ''}
            </div>
          );
        })}
      </div>
      {legend && (
      <ul className="seg-legend">
        {parts.map((p, i) => (
          <li key={p.label}>
            <i style={{ background: SERIES[i % SERIES.length] }} />
            <span>{p.label}</span>
          </li>
        ))}
      </ul>
      )}
      {node}
    </div>
  );
}

/** Radial meter for a single ratio. */
export function Ring({ pct, label, sub, color = SERIES[0] }: { pct: number; label: string; sub: string; color?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="ring">
      <svg viewBox="0 0 88 88" role="img" aria-label={`${label} ${p}%`}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e9edf5" strokeWidth="9" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="50" textAnchor="middle" className="ring-val">
          {Math.round(p)}%
        </text>
      </svg>
      <div className="ring-label">{label}</div>
      <div className="ring-sub">{sub}</div>
    </div>
  );
}

/** Ordered bands as columns; the top band is the accent, the rest recede. */
export function Columns({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const top = items.reduce((a, b) => (b.value > a.value ? b : a), items[0]);
  const { show, hide, node } = useTip();
  return (
    <div className="cols">
      {items.map((i) => (
        <div
          className="col"
          key={i.label}
          tabIndex={0}
          onPointerMove={(e) => show(e, i.label, `${i.value}% of listeners`)}
          onPointerLeave={hide}
          onFocus={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            show({ clientX: r.left, clientY: r.top }, i.label, `${i.value}% of listeners`);
          }}
          onBlur={hide}
        >
          <span className="col-val">{i.value}%</span>
          <div className="col-bar" style={{ height: `${(i.value / max) * 100}%`, background: i === top ? SERIES[0] : '#b7d3f6' }} />
          <span className="col-label">{i.label}</span>
        </div>
      ))}
      {node}
    </div>
  );
}

/** Ranked dots on a hairline: lighter than a bar, value at the tip. */
export function Lollipops({ items, format }: { items: { label: string; sub?: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const { show, hide, node } = useTip();
  return (
    <div className="lolli">
      {items.map((i, idx) => (
        <div
          className="lolli-row"
          key={i.label}
          tabIndex={0}
          onPointerMove={(e) => show(e, i.sub ? `${i.label}, ${i.sub}` : i.label, format(i.value), SERIES[0])}
          onPointerLeave={hide}
        >
          <div className="lolli-name">
            <div className="row-title">{i.label}</div>
            {i.sub && <div className="row-sub">{i.sub}</div>}
          </div>
          <div className="lolli-track">
            <div className="lolli-stem" style={{ width: `${(i.value / max) * 100}%` }}>
              <span className="lolli-dot" style={{ opacity: idx === 0 ? 1 : 0.55 }} />
            </div>
          </div>
          <div className="row-val">{format(i.value)}</div>
        </div>
      ))}
      {node}
    </div>
  );
}

/** Area chart with a snapping crosshair and one tooltip. */
export function HoverArea({ points, caption }: { points: { label: string; k: number }[]; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 190;
  const x0 = 44;
  const x1 = 620;
  const top = 14;
  const h = 130;
  const maxV = Math.max(...points.map((p) => p.k), 1);
  const max = Math.ceil((maxV * 1.1) / 50) * 50 || 50;
  const y = (v: number) => top + (1 - v / max) * h;
  const x = (i: number) => (points.length === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (points.length - 1));
  const line = points.map((p, i) => `${x(i)},${y(p.k)}`).join(' ');
  const area = `${x(0)},${y(0)} ${line} ${x(points.length - 1)},${y(0)}`;
  const fmt = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(2)}M` : `${Math.round(v)}K`);
  const ticks = [0, max / 2, max];
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i;
    });
    setHover(best);
  };
  const hp = hover === null ? null : points[hover];
  return (
    <div className="area-wrap">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SERIES[0]} stopOpacity="0.22" />
            <stop offset="1" stopColor={SERIES[0]} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} stroke="#e4e7ed" />
            <text x={0} y={y(v) + 4} className="axis">
              {v === 0 ? '0' : fmt(v)}
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#areaFill)" />
        <polyline points={line} fill="none" stroke={SERIES[0]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <text key={`${p.label}-${i}`} x={x(i)} y={y(0) + 24} textAnchor="middle" className="axis">
            {p.label}
          </text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={top} y2={y(0)} stroke="#c3cad6" />}
        {points.length > 0 && (
          <circle cx={x(hover ?? points.length - 1)} cy={y(points[hover ?? points.length - 1].k)} r="5" fill={SERIES[0]} stroke="#fff" strokeWidth="2" />
        )}
        <rect x="0" y="0" width={W} height={H} fill="transparent" />
      </svg>
      {hp && hover !== null && (
        <div className="viz-tip area-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <strong>{fmt(hp.k)} streams</strong>
          <span>
            <i style={{ background: SERIES[0] }} />
            {hp.label}
          </span>
        </div>
      )}
    </div>
  );
}
