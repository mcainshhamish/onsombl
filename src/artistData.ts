import { parseCsv } from './csv';
import type { Status, Task } from './data';

export class DataError extends Error {}

export interface ArtistData {
  overview: Record<string, string>;
  weeklyStreams: { week: string; k: number }[];
  cities: { city: string; country: string; k: number }[];
  tracks: { track: string; k: number; growth: number; share: number }[];
  sources: { source: string; detail: string; share: number }[];
  ages: { group: string; share: number }[];
  platformBreakdown: { platform: string; detail: string; k: number; share: number }[];
  accounts: { name: string; detail: string; connected: boolean }[];
  releases: { release: string; k: number; saveRate: number }[];
  nextSteps: { title: string; detail: string }[];
  conversations: { source: string; author: string; age: string; text: string; needsReply: boolean }[];
  project: { name: string; start: string; end: string; collaborators: number; documents: string[] };
  tasks: Task[];
}

type Row = Record<string, string>;

async function fetchRows(artist: string, file: string, columns: string[]): Promise<Row[]> {
  const url = `${import.meta.env.BASE_URL}data/${artist}/${file}.csv`;
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-cache' });
  } catch {
    throw new DataError(`Couldn't load ${file}.csv. Check your connection and try again.`);
  }
  if (!res.ok) throw new DataError(`${file}.csv was not found for "${artist}" (looked in data/${artist}/).`);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new DataError(`${file}.csv was not found for "${artist}" (looked in data/${artist}/).`);
  const rows = parseCsv(text);
  const header = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0].split(',').map((h) => h.trim());
  for (const c of columns) {
    if (!header.includes(c)) throw new DataError(`${file}.csv is missing the column "${c}". Expected columns: ${columns.join(', ')}.`);
  }
  return rows;
}

function num(row: Row, file: string, col: string, line: number): number {
  const raw = (row[col] ?? '').replace(/[%,]/g, '');
  const n = Number(raw);
  if (raw === '' || Number.isNaN(n)) throw new DataError(`${file}.csv, row ${line}: "${col}" must be a number (found "${row[col] ?? ''}").`);
  return n;
}

function bool(row: Row, file: string, col: string, line: number): boolean {
  const v = (row[col] ?? '').toLowerCase();
  if (v === 'true' || v === 'yes') return true;
  if (v === 'false' || v === 'no' || v === '') return false;
  throw new DataError(`${file}.csv, row ${line}: "${col}" must be true or false (found "${row[col]}").`);
}

function kv(rows: Row[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function need(map: Record<string, string>, file: string, keys: string[]) {
  for (const k of keys) {
    if (map[k] === undefined || map[k] === '') throw new DataError(`${file}.csv is missing a value for "${k}".`);
  }
}

const OVERVIEW_KEYS = [
  'window_label', 'last_synced', 'total_streams', 'total_streams_delta', 'listeners', 'listeners_delta',
  'saves', 'saves_delta', 'indexed_documents', 'followers', 'followers_delta', 'new_listeners',
  'new_listeners_note', 'save_rate', 'new_listeners_pct', 'returning_listeners_pct',
  'catalog_avg_save_rate_pct', 'new_comments', 'need_reply', 'sentiment_positive_pct',
  'sentiment_neutral_pct', 'sentiment_negative_pct',
];

export async function loadArtistData(artist: string): Promise<ArtistData> {
  const [overviewRows, weekly, cities, tracks, sources, ages, plat, accounts, releases, steps, convos, projectRows, tasks] =
    await Promise.all([
      fetchRows(artist, 'overview', ['key', 'value']),
      fetchRows(artist, 'weekly_streams', ['week', 'streams_k']),
      fetchRows(artist, 'listener_cities', ['city', 'country', 'listeners_k']),
      fetchRows(artist, 'tracks', ['track', 'streams_k', 'growth_pct', 'catalog_share_pct']),
      fetchRows(artist, 'stream_sources', ['source', 'detail', 'share_pct']),
      fetchRows(artist, 'age_groups', ['group', 'share_pct']),
      fetchRows(artist, 'platform_breakdown', ['platform', 'detail', 'streams_k', 'share_pct']),
      fetchRows(artist, 'connected_accounts', ['name', 'detail', 'connected']),
      fetchRows(artist, 'release_save_rates', ['release', 'streams_k', 'save_rate_pct']),
      fetchRows(artist, 'next_steps', ['title', 'detail']),
      fetchRows(artist, 'fan_conversations', ['source', 'author', 'age', 'text', 'needs_reply']),
      fetchRows(artist, 'project', ['key', 'value']),
      fetchRows(artist, 'tasks', ['id', 'title', 'category', 'note', 'assignee', 'due', 'status', 'priority']),
    ]);

  const overview = kv(overviewRows);
  need(overview, 'overview', OVERVIEW_KEYS);
  const p = kv(projectRows);
  need(p, 'project', ['name', 'start', 'end', 'collaborators', 'documents']);

  const ids = new Set<string>();
  const parsedTasks: Task[] = tasks.map((r, i) => {
    const line = i + 2;
    if (!r.id || !r.title) throw new DataError(`tasks.csv, row ${line}: "id" and "title" are required.`);
    if (ids.has(r.id)) throw new DataError(`tasks.csv, row ${line}: the id "${r.id}" is used more than once.`);
    ids.add(r.id);
    if (!['todo', 'progress', 'done'].includes(r.status)) {
      throw new DataError(`tasks.csv, row ${line}: "status" must be todo, progress or done (found "${r.status}").`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.due)) throw new DataError(`tasks.csv, row ${line}: "due" must look like 2026-11-24 (found "${r.due}").`);
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      note: r.note,
      assignee: r.assignee,
      due: r.due,
      status: r.status as Status,
      priority: r.priority === 'High' ? 'High' : undefined,
    };
  });

  return {
    overview,
    weeklyStreams: weekly.map((r, i) => ({ week: r.week, k: num(r, 'weekly_streams', 'streams_k', i + 2) })),
    cities: cities.map((r, i) => ({ city: r.city, country: r.country, k: num(r, 'listener_cities', 'listeners_k', i + 2) })),
    tracks: tracks.map((r, i) => ({
      track: r.track,
      k: num(r, 'tracks', 'streams_k', i + 2),
      growth: num(r, 'tracks', 'growth_pct', i + 2),
      share: num(r, 'tracks', 'catalog_share_pct', i + 2),
    })),
    sources: sources.map((r, i) => ({ source: r.source, detail: r.detail, share: num(r, 'stream_sources', 'share_pct', i + 2) })),
    ages: ages.map((r, i) => ({ group: r.group, share: num(r, 'age_groups', 'share_pct', i + 2) })),
    platformBreakdown: plat.map((r, i) => ({
      platform: r.platform,
      detail: r.detail,
      k: num(r, 'platform_breakdown', 'streams_k', i + 2),
      share: num(r, 'platform_breakdown', 'share_pct', i + 2),
    })),
    accounts: accounts.map((r, i) => ({ name: r.name, detail: r.detail, connected: bool(r, 'connected_accounts', 'connected', i + 2) })),
    releases: releases.map((r, i) => ({
      release: r.release,
      k: num(r, 'release_save_rates', 'streams_k', i + 2),
      saveRate: num(r, 'release_save_rates', 'save_rate_pct', i + 2),
    })),
    nextSteps: steps.map((r) => ({ title: r.title, detail: r.detail })),
    conversations: convos.map((r, i) => ({
      source: r.source,
      author: r.author,
      age: r.age,
      text: r.text,
      needsReply: bool(r, 'fan_conversations', 'needs_reply', i + 2),
    })),
    project: {
      name: p.name,
      start: p.start,
      end: p.end,
      collaborators: Number(p.collaborators) || 0,
      documents: p.documents.split('|').map((d) => d.trim()).filter(Boolean),
    },
    tasks: parsedTasks,
  };
}
