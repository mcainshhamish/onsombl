import type { Config } from '@netlify/functions';

// Settings (override with Netlify environment variables if you like)
const MODEL = process.env.CHAT_MODEL || 'claude-haiku-5-5';
const PER_VISITOR_DAILY = Number(process.env.CHAT_PER_VISITOR_DAILY || 20);
const GLOBAL_DAILY = Number(process.env.CHAT_GLOBAL_DAILY || 400);
const API_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages';

const ARTISTS: Record<string, string> = { maya: 'Maya Rivers', dev: 'Dev Okafor', owls: 'The Night Owls' };
const FILES = [
  'overview', 'weekly_streams', 'listener_cities', 'tracks', 'stream_sources', 'age_groups',
  'platform_breakdown', 'connected_accounts', 'release_save_rates', 'next_steps', 'fan_conversations', 'project', 'tasks',
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// --- daily counters (Netlify Blobs when available, memory otherwise) ---
const memory = new Map<string, number>();
async function bump(key: string, limit: number): Promise<boolean> {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('chat-usage');
    const current = Number((await store.get(key)) || 0);
    if (current >= limit) return false;
    await store.set(key, String(current + 1));
    return true;
  } catch {
    const current = memory.get(key) || 0;
    if (current >= limit) return false;
    memory.set(key, current + 1);
    return true;
  }
}

async function loadContext(origin: string, artist: string): Promise<string> {
  const parts = await Promise.all(
    FILES.map(async (f) => {
      const r = await fetch(`${origin}/data/${artist}/${f}.csv`);
      if (!r.ok) throw new Error(`Missing ${f}.csv`);
      return `### ${f}.csv\n${(await r.text()).trim()}`;
    }),
  );
  return parts.join('\n\n');
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'not_configured', message: 'The AI chat isn’t switched on yet (no API key set).' }, 503);

  let body: { artist?: string; messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request', message: 'Bad request.' }, 400);
  }
  const artist = String(body.artist || '');
  if (!ARTISTS[artist]) return json({ error: 'bad_request', message: 'Unknown artist.' }, 400);
  const msgs = (body.messages || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'bad_request', message: 'Ask a question first.' }, 400);

  // limits: per visitor (by IP) and across everyone, per day (UTC)
  const day = new Date().toISOString().slice(0, 10);
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  if (!(await bump(`${day}:visitor:${ip}`, PER_VISITOR_DAILY)))
    return json({ error: 'limit', message: `You’ve used your ${PER_VISITOR_DAILY} demo questions for today. Come back tomorrow.` }, 429);
  if (!(await bump(`${day}:all`, GLOBAL_DAILY)))
    return json({ error: 'limit', message: 'The demo has reached its daily question limit. Please try again tomorrow.' }, 429);

  let context: string;
  try {
    context = await loadContext(new URL(req.url).origin, artist);
  } catch {
    return json({ error: 'data', message: 'Couldn’t load the artist data.' }, 500);
  }

  const system = `You are ensemble, an AI marketing assistant for musicians. You are talking with ${ARTISTS[artist]}, a fictional demo artist.
Answer using ONLY the data below (CSV files). Be specific: quote the real numbers and names from the data.
If the question needs information that is not in the data (e.g. ad budgets, costs, other artists), say plainly what the data does and doesn't show, then give a sensible, clearly-labelled suggestion. Never invent figures.
Keep answers short: under 120 words, plain text, at most 3 short bullet points starting with "- ". No markdown headings or bold. Stay on music marketing for this artist; politely decline anything else.

DATA
${context}`;

  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: msgs }),
  });
  if (!upstream.ok) return json({ error: 'upstream', message: 'The AI service had a problem. Please try again.' }, 502);
  const out = (await upstream.json()) as { content?: { type: string; text?: string }[] };
  const text = (out.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return json({ reply: text || 'Sorry, I couldn’t come up with an answer.' });
};

export const config: Config = { path: '/api/chat' };
