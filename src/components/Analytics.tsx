import { useState, type ReactNode } from 'react';
import type { ArtistData } from '../artistData';
import { ChevronDown } from './Icons';

interface Props {
  data: ArtistData;
  name: string;
  connected: Record<string, boolean>;
  onAddAccounts: () => void;
}

const fmtK = (k: number) => (k >= 1000 ? `${+(k / 1000).toFixed(2)}M` : `${k}K`);
const pct1 = (n: number) => `${n.toFixed(1)}%`;

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="acard">
      <h3>{title}</h3>
      {sub && <p className="acard-sub">{sub}</p>}
      {children}
    </section>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="bar thin">
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

function StreamsChart({ weeks }: { weeks: { week: string; k: number }[] }) {
  const W = 643;
  const x0 = 58;
  const x1 = 619;
  const top = 12;
  const h = 132;
  const max = Math.max(500, Math.ceil(Math.max(...weeks.map((w) => w.k), 1) / 250) * 250);
  const y = (v: number) => top + (1 - v / max) * h;
  const x = (i: number) => (weeks.length === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (weeks.length - 1));
  const pts = weeks.map((w, i) => [x(i), y(w.k)] as const);
  const line = pts.map(([px, py]) => `${px},${py}`).join(' ');
  const area = `${x(0)},${y(0)} ${line} ${x(weeks.length - 1)},${y(0)}`;
  const ticks = [0, max / 2, max];
  return (
    <svg className="chart" viewBox={`0 0 ${W} 190`} role="img" aria-label="Weekly streams over time">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3e70d9" stopOpacity="0.22" />
          <stop offset="1" stopColor="#3e70d9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} stroke="#e1e7f0" />
          <text x={0} y={y(v) + 4} className="axis">
            {v === 0 ? '0' : fmtK(v)}
          </text>
        </g>
      ))}
      <polygon points={area} fill="url(#area)" />
      <polyline points={line} fill="none" stroke="#3e70d9" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map(([px, py], i) => (
        <g key={`${weeks[i].week}-${i}`}>
          <circle cx={px} cy={py} r="4" fill="#3e70d9" stroke="#fff" strokeWidth="1.5" />
          <text x={px} y={py - 12} textAnchor={i === 0 ? 'start' : i === weeks.length - 1 ? 'end' : 'middle'} className="point">
            {fmtK(weeks[i].k)}
          </text>
          <text x={px} y={y(0) + 28} textAnchor="middle" className="axis">
            {weeks[i].week}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Analytics({ data, name, connected, onAddAccounts }: Props) {
  const o = data.overview;
  const [range, setRange] = useState('Last 28 days');
  const [platform, setPlatform] = useState('All platforms');
  const connectedAccounts = data.accounts.filter((a) => connected[a.name] ?? a.connected);
  const unconnected = data.accounts.filter((a) => !(connected[a.name] ?? a.connected));
  const maxCity = Math.max(...data.cities.map((c) => c.k), 1);
  const maxRelease = 40;
  const avg = Number(o.catalog_avg_save_rate_pct) || 0;
  const releaseScale = Math.max(maxRelease, Math.ceil(Math.max(avg, ...data.releases.map((r) => r.saveRate)) / 10) * 10);
  const swatches = ['#3e70d9', '#8fa9e8', '#c9d8f6'];
  const newPct = Number(o.new_listeners_pct) || 0;
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
              <option>Last 28 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
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
          ['Total streams', o.total_streams, o.total_streams_delta, 'vs previous 28 days'],
          ['Spotify listeners', o.listeners, o.listeners_delta, 'vs previous 28 days'],
          ['Spotify saves', o.saves, o.saves_delta, 'vs previous 28 days'],
          ['Indexed documents', o.indexed_documents, 'All indexed', 'Ready for retrieval'],
        ].map(([label, value, delta, note]) => (
          <div className="acard kpi" key={label}>
            <span className="kpi-label">{label}</span>
            <strong>{value}</strong>
            <span className="kpi-delta">
              <b>{delta}</b> {note}
            </span>
          </div>
        ))}
      </div>

      <div className="agrid">
        <Card title="Streams over time" sub={`Weekly total · ${o.window_label}`}>
          <span className="legend">● {platform}</span>
          <StreamsChart weeks={data.weeklyStreams} />
        </Card>

        <Card title="Where your listeners are" sub="Spotify audience · Last 28 days">
          <div className="rows spaced">
            {data.cities.map((c) => (
              <div className="city" key={c.city}>
                <div>
                  <div className="row-title">{c.city}</div>
                  <div className="row-sub">{c.country}</div>
                </div>
                <Bar pct={(c.k / maxCity) * 100} />
                <div className="row-val">{fmtK(c.k)}</div>
              </div>
            ))}
          </div>
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
                  <td>{fmtK(t.k)}</td>
                  <td className="accent">{`${t.growth >= 0 ? '+' : ''}${t.growth.toFixed(1)}%`}</td>
                  <td>{pct1(t.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Your data, connected" sub={`${connectedAccounts.length} platforms · ${o.last_synced}`}>
          <ul className="connected">
            {connectedAccounts.map((a) => (
              <li key={a.name}>
                <span className="dot">●</span>
                <div>
                  <div className="row-title">{a.name}</div>
                  <div className="row-sub">{a.detail}</div>
                </div>
                <span className="synced">Synced</span>
              </li>
            ))}
          </ul>
          <button className="dashed" onClick={onAddAccounts}>
            +&nbsp;&nbsp;Add Instagram, TikTok or other accounts
          </button>
        </Card>

        <Card title="Where your streams come from" sub="Share of Spotify streams · Last 28 days">
          <div className="rows source">
            {data.sources.map((s) => (
              <div className="source-row" key={s.source}>
                <div>
                  <div className="row-title">{s.source}</div>
                  <div className="row-sub">{s.detail}</div>
                </div>
                <Bar pct={s.share} />
                <div className="row-val">{s.share}%</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Who’s listening" sub="Spotify audience · Age and loyalty">
          <div className="rows age">
            {data.ages.map((a) => (
              <div className="age-row" key={a.group}>
                <div className="row-title">{a.group}</div>
                <Bar pct={a.share} />
                <div className="row-val">{a.share}%</div>
              </div>
            ))}
          </div>
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

        <Card title="Platform breakdown" sub="Streams by platform · Last 28 days">
          <div className="stack">
            {data.platformBreakdown.map((p, i) => (
              <div key={p.platform} style={{ width: `${p.share}%`, background: swatches[i % swatches.length] }} />
            ))}
          </div>
          <div className="plat">
            {data.platformBreakdown.map((p, i) => (
              <div className="plat-row" key={p.platform}>
                <span className="swatch" style={{ background: swatches[i % swatches.length] }} />
                <div>
                  <div className="row-title">{p.platform}</div>
                  <div className="row-sub">{p.detail}</div>
                </div>
                <span className="plat-v">{fmtK(p.k)}</span>
                <span className="plat-p">{pct1(p.share)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Fan growth" sub="Followers and listener loyalty">
          <div className="growth">
            <div className="growth-row">
              <div>
                <div className="row-title">Spotify followers</div>
                <strong>{o.followers}</strong>
              </div>
              <div className="growth-note">
                <b>{o.followers_delta}</b>
                vs previous 28 days
              </div>
            </div>
            <div className="growth-row">
              <div>
                <div className="row-title">New listeners</div>
                <strong>{o.new_listeners}</strong>
              </div>
              <div className="growth-note">{o.new_listeners_note}</div>
            </div>
            <div className="growth-row">
              <div>
                <div className="row-title">Save rate</div>
                <strong>{o.save_rate}</strong>
              </div>
              <div className="growth-note">saves ÷ listeners</div>
            </div>
          </div>
        </Card>

        <Card title="How each release connects" sub="Save rate (saves ÷ listeners) · Last 28 days">
          <div className="release" style={{ ['--avg' as string]: String(avg / releaseScale) }}>
            <div className="avg-line">
              <span>Catalog average {pct1(avg)}</span>
            </div>
            {data.releases.map((r) => (
              <div className="release-row" key={r.release}>
                <div>
                  <div className="row-title">{r.release}</div>
                  <div className="row-sub">{fmtK(r.k)} streams</div>
                </div>
                <Bar pct={(r.saveRate / releaseScale) * 100} />
                <div className="row-val">{pct1(r.saveRate)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Suggested next steps" sub="Observations from your connected data">
          <div className="steps">
            {data.nextSteps.map((s) => (
              <div key={s.title}>
                <div className="row-title">{s.title}</div>
                <p>{s.detail}</p>
                <button className="link-btn">Ask onsombl about this →</button>
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

        <Card title="Social pulse" sub="Comments and mentions · Last 28 days">
          <div className="pulse">
            <div>
              <div className="row-title">New comments</div>
              <strong>{o.new_comments}</strong>
            </div>
            <div>
              <div className="row-title">Need a reply</div>
              <strong>{o.need_reply}</strong>
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
      </div>

      <div className="page-foot single">
        Reporting window: {o.window_label}. Growth compares the prior 28 days. Catalog shares are rounded.
      </div>
    </div>
  );
}
