export type Status = 'todo' | 'progress' | 'done';

export interface Task {
  id: string;
  title: string;
  category: string;
  note: string;
  assignee: string;
  due: string; // ISO date, e.g. 2026-11-24
  status: Status;
  priority?: 'High';
}

export const COLUMNS: { id: Status; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

export const CATEGORIES = ['Audience', 'Creative', 'Outreach', 'Marketing', 'Strategy', 'Data', 'Operations'];

export interface Persona {
  id: string;
  name: string;
  kind: string;
  possessive: string;
}

/** `id` is also the folder name under public/data/. */
export const PERSONAS: Persona[] = [
  { id: 'maya', name: 'Maya Rivers', kind: 'Artist workspace', possessive: 'Maya’s workspace' },
  { id: 'dev', name: 'Dev Okafor', kind: 'Artist workspace', possessive: 'Dev’s workspace' },
  { id: 'owls', name: 'The Night Owls', kind: 'Band workspace', possessive: 'The Night Owls’ workspace' },
];

export const RECENT_CONVERSATIONS = [
  'Why did Afterglow grow?',
  'Where are my listeners?',
  'Compare my last two releases',
  'Summer tour opportunities',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDue(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function formatRange(startIso: string, endIso: string): string {
  const [, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${MONTHS[sm - 1]} ${pad(sd)}–${MONTHS[em - 1]} ${pad(ed)}, ${ey}`;
}
