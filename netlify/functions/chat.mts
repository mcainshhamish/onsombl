import type { Config } from '@netlify/functions';

// Settings (override with Netlify environment variables if you like)
const MODEL = process.env.CHAT_MODEL || 'claude-haiku-5-5';
const PER_VISITOR_DAILY = Number(process.env.CHAT_PER_VISITOR_DAILY || 20);
const GLOBAL_DAILY = Number(process.env.CHAT_GLOBAL_DAILY || 400);
const API_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages';

const ARTISTS: Record<string, string> = { maya: 'Maya Rivers', dev: 'Dev Okafor', owls: 'The Night Owls' };
const FILES = [
  'profile', 'overview', 'weekly_streams', 'listener_cities', 'tracks', 'stream_sources', 'age_groups',
  'platform_breakdown', 'connected_accounts', 'release_save_rates', 'next_steps', 'fan_conversations', 'scene',
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

async function readLocal(artist: string, f: string): Promise<string | null> {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const roots = [process.env.LAMBDA_TASK_ROOT, process.cwd(), '/var/task'].filter(Boolean) as string[];
  for (const root of roots) {
    try {
      return await readFile(join(root, 'public', 'data', artist, `${f}.csv`), 'utf8');
    } catch {
      /* try next */
    }
  }
  return null;
}

// --- knowledge base: markdown documents in /knowledge, picked by keyword match ---
interface Doc { title: string; source: string; type: string; tags: string; body: string }
let docCache: Doc[] | null = null;
async function loadDocs(): Promise<Doc[]> {
  if (docCache) return docCache;
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const roots = [process.env.LAMBDA_TASK_ROOT, process.cwd(), '/var/task'].filter(Boolean) as string[];
  for (const root of roots) {
    try {
      const dir = join(root, 'knowledge');
      const names = (await readdir(dir)).filter((n) => n.endsWith('.md'));
      const docs: Doc[] = [];
      for (const n of names) {
        const raw = await readFile(join(dir, n), 'utf8');
        const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
        const head: Record<string, string> = {};
        (m ? m[1] : '').split('\n').forEach((l) => {
          const i = l.indexOf(':');
          if (i > 0) head[l.slice(0, i).trim()] = l.slice(i + 1).trim();
        });
        docs.push({
          title: head.title || n.replace(/\.md$/, ''),
          source: head.source || 'onsombl',
          type: head.type || 'note',
          tags: head.tags || '',
          body: (m ? m[2] : raw).trim(),
        });
      }
      return (docCache = docs);
    } catch {
      /* try next */
    }
  }
  return (docCache = []);
}

const STOP = new Set('the a an and or of to in on for is are was be my me i we our you your what how why which should can do does it this that with about from at as by'.split(' '));
const words = (t: string) => t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
function pickDocs(docs: Doc[], question: string, max = 4): Doc[] {
  const q = new Set(words(question));
  const scored = docs.map((d) => {
    const head = new Set(words(`${d.title} ${d.tags}`));
    const body = new Set(words(d.body));
    let s = 0;
    q.forEach((w) => { if (head.has(w)) s += 3; else if (body.has(w)) s += 1; });
    return { d, s };
  });
  return scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, max).map((x) => x.d);
}

async function loadContext(origin: string, artist: string): Promise<string> {
  const parts = await Promise.all(
    FILES.map(async (f) => {
      let text = await readLocal(artist, f);
      if (text === null) {
        const r = await fetch(`${origin}/data/${artist}/${f}.csv`);
        if (!r.ok) throw new Error(`Missing ${f}.csv`);
        text = await r.text();
      }
      return `### ${f}.csv\n${text.trim()}`;
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

  const lastQ = msgs[msgs.length - 1].content;
  const docs = pickDocs(await loadDocs(), lastQ);
  const library = docs.length
    ? docs.map((d) => `### ${d.title} (${d.type}; source: ${d.source})\n${d.body}`).join('\n\n')
    : '(no matching documents)';

  const system = `You are onsombl, an AI marketing assistant for musicians. You are talking with ${ARTISTS[artist]}, a fictional demo artist.
Answer using ONLY the data below (CSV files). Be specific: quote the real numbers and names from the data.
If the question needs information that is not in the data (e.g. ad budgets, costs, other artists), say plainly what the data does and doesn't show, then give a sensible, clearly-labelled suggestion. Never invent figures.
Keep answers short: under 120 words, plain text, at most 3 short bullet points starting with "- ". No markdown headings or bold. Stay on music marketing for this artist; politely decline anything else.
Also use the KNOWLEDGE documents below for marketing advice when relevant. Combine them with the artist's real numbers. Treat anything marked as example or placeholder as illustrative, not as industry fact.
If you used any KNOWLEDGE document, end your reply with one final line exactly like: Sources: Title One; Title Two (exact titles, nothing else on that line). If you used none, omit that line.
The scene file lists fictional local people and venues the artist could collaborate with. When asked who to meet or work with, recommend from it by name, with the reason and first step. When asked to draft an intro message, write a short, friendly, specific one (under 90 words) the artist could send.
Never say task ids (like "t1") or file names (like "tracks.csv") in your text - refer to things by their plain names.
If asked to add or change tasks, say in one line that you can't do that yet and suggest a task title the person can use in their own tools.

KNOWLEDGE
${library}

DATA
${context}`;

  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 450, system, messages: msgs }),
  });
  if (!upstream.ok) return json({ error: 'upstream', message: 'The AI service had a problem. Please try again.' }, 502);
  const out = (await upstream.json()) as { content?: { type: string; text?: string }[] };
  const text = (out.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  let reply = text;
  let sources: string[] = [];
  const sm = reply.match(/\n?\s*Sources?:\s*([^\n]+)\s*$/i);
  if (sm) {
    reply = reply.slice(0, sm.index).trim();
    const known = new Set(docs.map((d) => d.title));
    sources = sm[1].split(';').map((t) => t.trim()).filter((t) => known.has(t));
  }
  return json({ reply: reply || 'Sorry, I couldn’t come up with an answer.', sources });
};

export const config: Config = { path: '/api/chat' };
