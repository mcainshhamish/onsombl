import { useState, type ReactNode } from 'react';
import type { ArtistData } from '../artistData';
import { ChevronDown } from './Icons';
import { Columns, HoverArea, Lollipops, Ring, Segmented, Sparkline, SERIES } from './viz';

interface Props {
  data: ArtistData;
  name: string;
  connected: Record<string, boolean>;
  onAddAccounts: () => void;
  onAsk: (q: string) => void;
  onSignup: (source: string) => void;
}

const pct1 = (n: number) => `${n.toFixed(1)}%`;

// "248K" / "1.28M" / "312" -> number
function parseCount(v: string): number {
  const m = /^\s*([\d.,]+)\s*([KMB]?)/i.exec(v || '');
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return n * ({ K: 1e3, M: 1e6, B: 1e9 } as Record<string, number>)[m[2].toUpperCase()] || n;
}
function fmtCount(n: number): string {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e5) return `${Math.round(n / 1e3)}K`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
const deltaNum = (d: string) => parseFloat((d || '').replace(/[^\d.\-]/g, '')) * (/[↓-]/.test(d || '') ? -1 : 1) || 0;
const fmtDelta = (n: number) => `${n >= 0 ? '↑' : '↓'} ${Math.abs(n).toFixed(1)}%`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 28 days', days: 28 },
];

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="acard">
      <h3>{title}</h3>
      {sub && <p className="acard-sub">{sub}</p>}
      {children}
    </section>
  );
}

export default function Analytics({ data, name, connected, onAddAccounts, onAsk, onSignup }: Props) {
  const o = data.overview;
  const [range, setRange] = useState('Last 28 days');
  const days = RANGES.find((r) => r.label === range)?.days ?? 28;
  const [platform, setPlatform] = useState('All platforms');
  const connectedAccounts = data.accounts.filter((a) => connected[a.name] ?? a.connected);
  const unconnected = data.accounts.filter((a) => !(connected[a.name] ?? a.connected));
  const avg = Number(o.catalog_avg_save_rate_pct) || 0;
  const newPct = Number(o.new_listeners_pct) || 0;

  // Everything below is derived from the 28-day CSV figures so the filters stay consistent.
  const wk = data.weeklyStreams;
  const wkTotal = wk.reduce((a, w) => a + w.k, 0) || 1;
  const last = wk[wk.length - 1]?.k ?? 0;
  const prev = wk[wk.length - 2]?.k ?? last;
  const lastTwo = wk.slice(-2).reduce((a, w) => a + w.k, 0);
  const firstTwo = wk.slice(0, 2).reduce((a, w) => a + w.k, 0);
  const periodStreams = days === 7 ? last : days === 14 ? lastTwo : wkTotal;
  const fr = periodStreams / wkTotal; // share of the 28-day volume in the chosen window
  const plat = data.platformBreakdown.find((p) => p.platform === platform);
  const fp = plat ? plat.share / 100 : 1;
  const fl = Math.pow(fr, 0.7) * fp; // unique people grow slower than streams
  const streamsDelta28 = deltaNum(o.total_streams_delta);
  const streamsDelta = days === 7 ? ((last - prev) / (prev || 1)) * 100 : days === 14 ? ((lastTwo - firstTwo) / (firstTwo || 1)) * 100 : streamsDelta28;
  const dFor = (d28: string) => fmtDelta(streamsDelta28 ? (deltaNum(d28) / streamsDelta28) * streamsDelta : deltaNum(d28));
  const prevNote = `vs previous ${days} days`;
  const rangeShort = `Last ${days} days`;
  const end = /([A-Za-z]{3}) (\d{1,2}), (\d{4})\s*$/.exec(o.window_label);
  const endDate = end ? new Date(Number(end[3]), MON.indexOf(end[1]), Number(end[2])) : null;
  const dateLabel = (offset: number) => {
    if (!endDate) return '';
    const d = new Date(endDate);
    d.setDate(d.getDate() - offset);
    return `${MON[d.getMonth()]} ${d.getDate()}`;
  };
  const windowLabel = days === 28 || !endDate ? o.window_label : `${dateLabel(days - 1)}–${dateLabel(0)}, ${endDate.getFullYear()}`;
  const chartWeeks =
    days === 28
      ? wk.map((w) => ({ week: w.week, k: Math.round(w.k * fp) }))
      : days === 14
        ? wk.slice(-2).map((w) => ({ week: w.week, k: Math.round(w.k * fp) }))
        : [0.13, 0.13, 0.14, 0.14, 0.15, 0.16, 0.15].map((wgt, i) => ({ week: endDate ? dateLabel(6 - i) : `Day ${i + 1}`, k: Math.round(last * wgt * fp) }));
  const streamsN = parseCount(o.total_streams) * fr * fp;
  const kpiLabelPrefix = plat ? plat.platform : 'Spotify';
  const pos = Number(o.sentiment_positive_pct) || 0;
  const neu = Number(o.sentiment_neutral_pct) || 0;
  const neg = Number(o.sentiment_negative_pct) || 0;

  return (
    <div className="page analytics">
      <div className="topbar">
        <div className="crumbs">
          Workspace&nbsp;&nbsp;/&nbsp;&nbsp;My audience
        </div>
        <div className="topbar-actions">
          <button className="btn-solid btn-small wide" onClick={onAddAccounts}>
            +&nbsp;&nbsp;Add your music accounts
          </button>
          <button className="btn-soft light" onClick={() => window.print()}>
            ↓&nbsp;&nbsp;Export report
          </button>
        </div>
      </div>

      <div className="a-title-row">
        <div>
          <h1 className="page-title">A pulse on your music.</h1>
          <p className="page-sub">{name} · Catalog performance across your connected music platforms</p>
        </div>
        <div className="a-filters">
          <label className="chip-select">
            <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              {RANGES.map((r) => (
                <option key={r.label}>{r.label}</option>
              ))}
            </select>
            <ChevronDown width={11} height={11} />
          </label>
          <label className="chip-select">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
              <option>All platforms</option>
              {data.platformBreakdown.map((p) => (
                <option key={p.platform}>{p.platform}</option>
              ))}
            </select>
            <ChevronDown width={11} height={11} />
          </label>
        </div>
      </div>

      <div className="kpis">
        {[
          ['Total streams', fmtCount(streamsN), dFor(o.total_streams_delta), prevNote],
          [`${kpiLabelPrefix} listeners`, fmtCount(parseCount(o.listeners) * fl), dFor(o.listeners_delta), prevNote],
          [`${kpiLabelPrefix} saves`, fmtCount(parseCount(o.saves) * fr * fp), dFor(o.saves_delta), prevNote],
          ['Indexed documents', o.indexed_documents, 'All indexed', 'Ready for retrieval'],
        ].map(([label, value, delta, note]) => (
          <div className="acard kpi" key={label}>
            <span className="kpi-label">{label}</span>
            <strong>{value}</strong>
            <span className="kpi-delta">
              <b>{delta}</b> {note}
            </span>
            {label !== 'Indexed documents' && <Sparkline values={chartWeeks.map((w) => w.k)} />}
          </div>
        ))}
      </div>

      <div className="agrid">
        <Card title="Streams over time" sub={`${days === 7 ? 'Daily' : 'Weekly'} total · ${windowLabel}`}>
          <span className="legend">● {platform}</span>
          <HoverArea points={chartWeeks.map((w) => ({ label: w.week, k: w.k }))} caption={`${platform} streams, ${windowLabel}`} />
        </Card>

        <Card title="Where your listeners are" sub={`${kpiLabelPrefix} audience · ${rangeShort}`}>
          <Lollipops
            items={data.cities.map((c) => ({ label: c.city, sub: c.country, value: c.k * 1e3 * fl }))}
            format={(v) => fmtCount(v)}
          />
        </Card>

        <Card title="Your top tracks" sub={`All ${data.tracks.length} tracks in this demo catalog`}>
          <table className="tracks">
            <thead>
              <tr>
                <th>TRACK</th>
                <th>STREAMS</th>
                <th>GROWTH</th>
                <th>CATALOG SHARE</th>
              </tr>
            </thead>
            <tbody>
              {data.tracks.map((t, i) => (
                <tr key={t.track}>
                  <td>
                    <span className="track-n">{String(i + 1).padStart(2, '0')}</span>
                    {t.track}
                  </td>
                  <td>{fmtCount(t.k * 1e3 * fr * fp)}</td>
                  <td className="accent">{`${t.growth >= 0 ? '+' : ''}${t.growth.toFixed(1)}%`}</td>
                  <td>{pct1(t.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Where your streams come from" sub={`Share of Spotify streams · ${rangeShort}`}>
          <Segmented parts={data.sources.map((x) => ({ label: x.source, value: x.share, detail: x.detail }))} />
        </Card>

        <Card title="Who’s listening" sub="Spotify audience · Age and loyalty">
          <Columns items={data.ages.map((x) => ({ label: x.group, value: x.share }))} />
          <div className="split-block">
            <div className="row-title">New vs returning listeners</div>
            <div className="split">
              <div style={{ width: `${newPct}%` }} />
            </div>
            <div className="split-labels">
              <span>New {o.new_listeners_pct}%</span>
              <span>Returning {o.returning_listeners_pct}%</span>
            </div>
          </div>
        </Card>

        <Card title="Platform breakdown" sub={`Streams by platform · ${rangeShort}`}>
          <Segmented
            legend={false}
            unit="%"
            parts={data.platformBreakdown.map((p) => ({ label: p.platform, value: p.share, detail: p.detail }))}
          />
          <div className="plat">
            {data.platformBreakdown.map((p, i) => (
              <div className="plat-row" key={p.platform} style={plat && plat.platform !== p.platform ? { opacity: 0.45 } : undefined}>
                <span className="swatch" style={{ background: SERIES[i % SERIES.length] }} />
                <div>
                  <div className="row-title">{p.platform}</div>
                  <div className="row-sub">{p.detail}</div>
                </div>
                <span className="plat-v">{fmtCount(p.k * 1e3 * fr)}</span>
                <span className="plat-p">{pct1(p.share)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Fan growth" sub="Followers and listener loyalty">
          <div className="rings">
            <Ring pct={newPct} label="New listeners" sub={`${fmtCount(parseCount(o.new_listeners) * fl)} people`} />
            <Ring pct={Number(String(o.save_rate).replace('%', '')) || 0} label="Save rate" sub={`avg ${pct1(avg)}`} color={SERIES[2]} />
            <Ring pct={pos} label="Positive buzz" sub={`${o.new_comments} comments`} color={SERIES[3]} />
          </div>
          <div className="growth">
            <div className="growth-row">
              <div>
                <div className="row-title">Spotify followers</div>
                <strong>{o.followers}</strong>
              </div>
              <div className="growth-note">
                <b>{dFor(o.followers_delta)}</b>
                {prevNote}
              </div>
            </div>
          </div>
        </Card>

        <Card title="How each release connects" sub={`Save rate (saves ÷ listeners) · ${rangeShort}`}>
          <Lollipops items={data.releases.map((r) => ({ label: r.release, sub: `${fmtCount(r.k * 1e3 * fr * fp)} streams`, value: r.saveRate }))} format={pct1} />
          <p className="avg-note">Catalog average {pct1(avg)}</p>
        </Card>

        <Card title="Suggested next steps" sub="Observations from your connected data">
          <div className="steps">
            {data.nextSteps.map((s) => (
              <div key={s.title}>
                <div className="row-title">{s.title}</div>
                <p>{s.detail}</p>
                <div className="step-actions">
                  <button className="link-btn" onClick={() => onAsk(`Tell me more about this: ${s.title}. ${s.detail}`)}>
                    Ask onsombl about this →
                  </button>
                  <button className="link-btn" onClick={() => onSignup('notion')}>
                    Send to Notion
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Fan conversations" sub="Recent comments and mentions across platforms · Demo comments">
          <ul className="convos">
            {data.conversations.map((c) => (
              <li key={`${c.author}-${c.age}`}>
                <div className="convo-head">
                  <span className="src">{c.source}</span>
                  <span className="who">{c.author}</span>
                  {c.needsReply && <span className="needs">Needs reply</span>}
                  <span className="when">{c.age}</span>
                </div>
                <div className="convo-body">
                  <span>{c.text}</span>
                  <button className="link-btn">Reply →</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Social pulse" sub={`Comments and mentions · ${rangeShort}`}>
          <div className="pulse">
            <div>
              <div className="row-title">New comments</div>
              <strong>{fmtCount(parseCount(o.new_comments) * fr)}</strong>
            </div>
            <div>
              <div className="row-title">Need a reply</div>
              <strong>{fmtCount(parseCount(o.need_reply) * Math.max(fr, 0.25))}</strong>
            </div>
          </div>
          <div className="row-title sent-title">Sentiment</div>
          <div className="sentiment">
            <div style={{ width: `${pos}%`, background: '#3e70d9' }} />
            <div style={{ width: `${neu}%`, background: '#c9d8f6' }} />
            <div style={{ width: `${neg}%`, background: '#a3adbf' }} />
          </div>
          <div className="split-labels">
            <span>Positive {pos}%</span>
            <span>Neutral {neu}%</span>
            <span>Negative {neg}%</span>
          </div>
          {unconnected.length > 0 && (
            <div className="not-connected">
              <div className="row-title">Not yet connected</div>
              {unconnected.map((a) => (
                <div className="nc-row" key={a.name}>
                  <div>
                    <div className="row-title">{a.name}</div>
                    <div className="row-sub">{a.detail}</div>
                  </div>
                  <button className="btn-soft tiny" onClick={onAddAccounts}>
                    Add {a.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Connections" sub={`${connectedAccounts.length} platforms connected`}>
          <ul className="connected">
            {connectedAccounts.map((a) => (
              <li key={a.name}>
                <span className="dot">●</span>
                <div>
                  <div className="row-title">{a.name}</div>
                  <div className="row-sub">{a.detail}</div>
                </div>
                <span className="synced">Connected</span>
              </li>
            ))}
          </ul>
          <button className="dashed" onClick={onAddAccounts}>
            +&nbsp;&nbsp;Add Instagram, TikTok or other accounts
          </button>
        </Card>

      </div>

      <div className="page-foot single">
        Reporting window: {windowLabel}. Growth compares the prior {days} days. Shorter windows and single platforms are estimated from the 28-day totals. Catalog shares are rounded.
      </div>
    </div>
  );
}
