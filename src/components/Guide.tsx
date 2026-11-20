import type { ReactNode } from 'react';
import type { ArtistData } from '../artistData';

interface Props {
  data: ArtistData;
  name: string;
  onAsk: (question: string) => void;
}

// "248K" -> 248000, "1.28M" -> 1280000
function parseCount(text: string): number {
  const m = text.trim().match(/^([\d.,]+)\s*([KkMm]?)/);
  if (!m) return 0;
  const n = Number(m[1].replace(/,/g, ''));
  if (Number.isNaN(n)) return 0;
  return m[2].toLowerCase() === 'm' ? n * 1_000_000 : m[2].toLowerCase() === 'k' ? n * 1_000 : n;
}

const BANDS: { min: number; label: string; text: string }[] = [
  { min: 1_000_000, label: 'Major audience', text: 'Over 1M listeners. At this size the work shifts from finding fans to keeping a very large audience engaged.' },
  { min: 100_000, label: 'Established', text: '100K to 1M listeners. A real, repeatable audience. The next gains come from loyalty and from more cities.' },
  { min: 10_000, label: 'Growing', text: '10K to 100K listeners. Enough people to learn from the data. Focus on what already works.' },
  { min: 1_000, label: 'Early stage', text: '1K to 10K listeners. Every new fan counts. Focus on a small number of clear actions.' },
  { min: 0, label: 'Just starting', text: 'Under 1K listeners. Focus on getting the first few hundred real fans.' },
];

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="acard guide-card">
      <div className="guide-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Guide({ data, name, onAsk }: Props) {
  const o = data.overview;
  const pr = data.profile;
  const first = name.startsWith('The ') ? name : name.split(' ')[0];
  const listeners = parseCount(o.listeners);
  const band = BANDS.find((b) => listeners >= b.min) ?? BANDS[BANDS.length - 1];
  const topTrack = [...data.tracks].sort((a, b) => b.k - a.k)[0];
  const topCity = [...data.cities].sort((a, b) => b.k - a.k)[0];
  const topSource = [...data.sources].sort((a, b) => b.share - a.share)[0];
  const topAge = [...data.ages].sort((a, b) => b.share - a.share)[0];
  const bestRelease = [...data.releases].sort((a, b) => b.saveRate - a.saveRate)[0];
  const avg = Number(o.catalog_avg_save_rate_pct) || 0;
  const connected = data.accounts.filter((a) => a.connected).map((a) => a.name);

  const facts: string[] = [];
  if (topTrack) facts.push(`${topTrack.track} is the biggest track, with ${topTrack.k}K streams and ${topTrack.share.toFixed(1)}% of the catalog.`);
  if (topCity) facts.push(`${topCity.city}, ${topCity.country} is the biggest city, with ${topCity.k}K listeners.`);
  if (topSource) facts.push(`${topSource.share}% of streams come from ${topSource.source.toLowerCase()} (${topSource.detail}).`);
  if (topAge) facts.push(`The largest age group is ${topAge.group}, at ${topAge.share}% of listeners.`);
  facts.push(`${o.new_listeners_pct}% of listeners are new and ${o.returning_listeners_pct}% are returning.`);
  if (bestRelease) facts.push(`${bestRelease.release} has the best save rate at ${bestRelease.saveRate.toFixed(1)}%, against a catalog average of ${avg.toFixed(1)}%.`);
  facts.push(`Fan comments are ${o.sentiment_positive_pct}% positive, ${o.sentiment_neutral_pct}% neutral and ${o.sentiment_negative_pct}% negative, and ${o.need_reply} need a reply.`);

  return (
    <div className="page guide">
      <div className="topbar">
        <div className="crumbs">Workspace&nbsp;&nbsp;/&nbsp;&nbsp;Guide</div>
      </div>
      <h1 className="page-title">A guide to {name}.</h1>
      <p className="page-sub">
        {pr.genre} · {pr.basedIn} · {pr.careerStage} · active since {pr.activeSince}
      </p>

      <Section
        title={`About ${first}`}
        action={
          <button className="link-btn" onClick={() => onAsk(`Give me a short summary of ${name} and where we are right now.`)}>
            Ask ensemble →
          </button>
        }
      >
        <p className="guide-text">{pr.bio}</p>
        <p className="guide-text">
          <b>Current goal:</b> {pr.goal}
        </p>
        <div className="guide-tiles">
          {[
            ['Spotify listeners', o.listeners, `${o.listeners_delta} vs previous 28 days`],
            ['Followers', o.followers, `${o.followers_delta} vs previous 28 days`],
            ['Total streams', o.total_streams, `${o.total_streams_delta} vs previous 28 days`],
            ['Save rate', o.save_rate, 'saves ÷ listeners'],
          ].map(([label, value, note]) => (
            <div className="guide-tile" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <em>{note}</em>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`How big is ${first}?`}>
        <p className="guide-text">
          With {o.listeners} Spotify listeners over the last 28 days, {first} sits in the <b>{band.label}</b> band. {band.text}
        </p>
        <p className="guide-note">These bands are ensemble’s own rough guide, not an industry standard. Compare {first} with their own past numbers first.</p>
      </Section>

      <Section
        title="What the data says"
        action={
          <button className="link-btn" onClick={() => onAsk(`What are the three most important things in ${first}'s data right now?`)}>
            Ask ensemble →
          </button>
        }
      >
        <ul className="guide-list">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="guide-note">
          Reporting window: {o.window_label}. Connected platforms: {connected.length ? connected.join(', ') : 'none yet'}. {o.indexed_documents} documents are indexed.
        </p>
      </Section>

      <Section title="Suggested focus">
        <div className="guide-steps">
          {data.nextSteps.map((s) => (
            <div key={s.title}>
              <div className="row-title">{s.title}</div>
              <p className="guide-text">{s.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How to read these numbers">
        <dl className="guide-defs">
          <dt>Save rate</dt>
          <dd>The share of listeners who save a track to their library. It’s a sign people want to hear it again. Compare it with your own catalog average rather than a universal target.</dd>
          <dt>Algorithmic streams</dt>
          <dd>Streams that come from Spotify recommending your music, such as Discover Weekly, Radio and Release Radar. They bring new listeners, but those listeners don’t always stay.</dd>
          <dt>New vs returning listeners</dt>
          <dd>New listeners show how far your music is spreading. Returning listeners show whether people come back. Both matter, and returning is the stronger signal of real fans.</dd>
          <dt>Catalog share</dt>
          <dd>How much of your total streams a single track accounts for. A very high share means the catalog depends on one song.</dd>
        </dl>
      </Section>

      <Section title="Marketing basics worth knowing">
        <ul className="guide-list">
          <li>Pitch new releases to Spotify’s editors through Spotify for Artists before release day. The earlier you do it, the more time they have.</li>
          <li>Focus your effort on the cities where your listeners already are. Local posts, playlists and shows work better there than broad advertising.</li>
          <li>Give new listeners a reason to come back: a follow, a save, a mailing list or a short behind-the-scenes post.</li>
          <li>Answer fan comments quickly. It costs nothing and builds loyalty.</li>
          <li>Test ideas with a small budget first, measure the result, and only then scale up.</li>
        </ul>
        <p className="guide-note">General guidance for independent artists. The numbers above are demo data.</p>
      </Section>
    </div>
  );
}
