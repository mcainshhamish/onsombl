import type { Config } from '@netlify/functions';

// Settings (override with Netlify environment variables if you like)
const MODEL = process.env.CHAT_MODEL || 'claude-haiku-5-5';
const PER_VISITOR_DAILY = Number(process.env.CHAT_PER_VISITOR_DAILY || 20);
const GLOBAL_DAILY = Number(process.env.CHAT_GLOBAL_DAILY || 400);
const API_URL = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages';

const ARTISTS: Record<string, string> = { maya: 'Maya Rivers', dev: 'Dev Okafor', owls: 'The Night Owls' };
const FILES = [
  'profile', 'overview', 'weekly_streams', 'listener_cities', 'tracks', 'stream_sources', 'age_groups',
  'platform_breakdown', 'connected_accounts', 'release_save_rates', 'next_steps', 'fan_conversations', 'project',
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

  let body: { artist?: string; messages?: { role: string; content: string }[]; tasks?: { id: string; title: string; status: string; due?: string }[] };
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

  const CATS = ['Audience', 'Creative', 'Outreach', 'Marketing', 'Strategy', 'Data', 'Operations'];
  const STATUSES = ['todo', 'progress', 'done'];
  const live = (Array.isArray(body.tasks) ? body.tasks : []).slice(0, 40).filter((t) => t && typeof t.id === 'string' && typeof t.title === 'string');
  const taskBlock = live.length
    ? live.map((t) => `${String(t.id).slice(0, 12)} | ${String(t.title).slice(0, 80)} | ${STATUSES.includes(t.status) ? t.status : 'todo'} | due ${String(t.due || '').slice(0, 10)}`).join('\n')
    : '(no tasks yet)';
  const today = new Date().toISOString().slice(0, 10);

  const tools = [
    {
      name: 'add_task',
      description: 'Add a task to the person\'s project board (To do column). Use when they ask to add, create or put something on their to-do list / task board / plan.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short action title, under 60 characters' },
          category: { type: 'string', enum: CATS },
          note: { type: 'string', description: 'Optional one-line detail' },
          due: { type: 'string', description: 'YYYY-MM-DD, within the next 3 weeks unless they say otherwise' },
          high_priority: { type: 'boolean' },
        },
        required: ['title', 'category'],
      },
    },
    {
      name: 'update_task_status',
      description: 'Move an existing task to another column. Use the task id from the TASK BOARD list.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string' }, status: { type: 'string', enum: STATUSES } },
        required: ['id', 'status'],
      },
    },
  ];

  const system = `You are ensemble, an AI marketing assistant for musicians. You are talking with ${ARTISTS[artist]}, a fictional demo artist.
Answer using ONLY the data below (CSV files). Be specific: quote the real numbers and names from the data.
If the question needs information that is not in the data (e.g. ad budgets, costs, other artists), say plainly what the data does and doesn't show, then give a sensible, clearly-labelled suggestion. Never invent figures.
Keep answers short: under 120 words, plain text, at most 3 short bullet points starting with "- ". No markdown headings or bold. Stay on music marketing for this artist; politely decline anything else.
Never say task ids (like "t1") or file names (like "tracks.csv") in your text - refer to things by their plain names.
You CAN act on the person's task board: use add_task to add tasks and update_task_status to move them (only for tasks listed below). Do it when asked, or when they agree to a task you suggested ("add that", "yes do it"). Never claim you did something you did not call a tool for. After acting, reply with one short sentence confirming what you did. Today is ${today}.

TASK BOARD (id | title | status | due)
${taskBlock}

DATA
${context}`;

  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 500, system, messages: msgs, tools }),
  });
  if (!upstream.ok) return json({ error: 'upstream', message: 'The AI service had a problem. Please try again.' }, 502);
  const out = (await upstream.json()) as { content?: { type: string; text?: string; name?: string; input?: Record<string, unknown> }[] };
  const blocks = out.content || [];
  let text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();

  const actions: Record<string, unknown>[] = [];
  const confirms: string[] = [];
  for (const b of blocks) {
    if (b.type !== 'tool_use' || !b.input) continue;
    if (b.name === 'add_task') {
      const title = String(b.input.title || '').trim().slice(0, 80);
      if (!title) continue;
      const category = CATS.includes(String(b.input.category)) ? String(b.input.category) : 'Strategy';
      const dueIn = String(b.input.due || '');
      const due = /^\d{4}-\d{2}-\d{2}$/.test(dueIn) ? dueIn : new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
      actions.push({ type: 'add_task', title, category, note: String(b.input.note || 'Added from chat').slice(0, 120), due, priority: b.input.high_priority ? 'High' : '' });
      confirms.push(`Added “${title}” to your To do list.`);
    } else if (b.name === 'update_task_status') {
      const t = live.find((x) => x.id === String(b.input.id));
      const status = String(b.input.status);
      if (!t || !STATUSES.includes(status)) continue;
      actions.push({ type: 'update_task_status', id: t.id, status });
      confirms.push(`Moved “${t.title}” to ${status === 'todo' ? 'To do' : status === 'progress' ? 'In progress' : 'Done'}.`);
    }
  }
  if (actions.length && !text) text = confirms.join(' ');
  return json({ reply: text || 'Sorry, I couldn’t come up with an answer.', actions });
};

export const config: Config = { path: '/api/chat' };
