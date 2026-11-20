import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { CATEGORIES, COLUMNS, formatDue, formatRange, type Status, type Task } from '../data';
import type { ArtistData } from '../artistData';
import { toCsv } from '../csv';
import { ChevronDown, PlusIcon } from './Icons';
import Modal from './Modal';

interface Props {
  data: ArtistData;
  personaId: string;
  onAddAccounts: () => void;
}

const storageKey = (personaId: string) => `ensemble.tasks.v2.${personaId}`;

function loadTasks(personaId: string, fallback: Task[]): Task[] {
  try {
    const raw = localStorage.getItem(storageKey(personaId));
    if (raw) return JSON.parse(raw) as Task[];
  } catch {
    /* storage unavailable: use the CSV file */
  }
  return fallback;
}

const TASK_COLUMNS = ['id', 'title', 'category', 'note', 'assignee', 'due', 'status', 'priority'];

export default function ProjectBoard({ data, personaId, onAddAccounts }: Props) {
  const { project } = data;
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(personaId, data.tasks));
  const assignees = useMemo(() => Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))), [tasks]);
  const [tab, setTab] = useState<'board' | 'timeline'>('board');
  const [assignee, setAssignee] = useState<string>('All');
  const [category, setCategory] = useState<string>('All');
  const [dialog, setDialog] = useState<null | { kind: 'task'; status: Status } | { kind: 'brief' } | { kind: 'project' }>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(personaId), JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks, personaId]);

  const resetToFile = () => {
    try {
      localStorage.removeItem(storageKey(personaId));
    } catch {
      /* ignore */
    }
    setTasks(data.tasks);
    setAssignee('All');
    setCategory('All');
  };

  const downloadCsv = () => {
    const rows = tasks.map((t) => ({ ...t, priority: t.priority ?? '' }));
    const blob = new Blob([toCsv(rows, TASK_COLUMNS)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const done = tasks.filter((t) => t.status === 'done').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const visible = useMemo(
    () => tasks.filter((t) => (assignee === 'All' || t.assignee === assignee) && (category === 'All' || t.category === category)),
    [tasks, assignee, category],
  );

  const move = (id: string, status: Status) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
  const remove = (id: string) => setTasks((ts) => ts.filter((t) => t.id !== id));

  const onDrop = (e: DragEvent, status: Status) => {
    e.preventDefault();
    if (dragId) move(dragId, status);
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className="page">
      <div className="topbar">
        <div className="crumbs">
          Workspace&nbsp;&nbsp;/&nbsp;&nbsp;Project management
        </div>
        <div className="topbar-actions">
          <button className="btn-soft" onClick={onAddAccounts}>
            +&nbsp;&nbsp;Add your music accounts
          </button>
          <button className="btn-solid btn-small new-project" onClick={() => setDialog({ kind: 'project' })}>
            <PlusIcon width={11} height={11} /> New project
          </button>
        </div>
      </div>

      <h1 className="page-title">Turn insight into momentum.</h1>
      <p className="page-sub">Plan your next move, keep your team in sync, and connect tasks to the data behind them.</p>

      <section className="summary" aria-label={`${project.name} summary`}>
        <div className="summary-left">
          <span className="chip">ACTIVE PROJECT</span>
          <h2>{project.name}</h2>
          <p>
            {formatRange(project.start, project.end)}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;{project.collaborators} collaborators&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;{project.documents.length} linked documents
          </p>
        </div>
        <div className="summary-right">
          <div className="progress-head">
            <span>
              {done} of {tasks.length} tasks complete
            </span>
            <span>{pct}%</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <button className="link-btn" onClick={() => setDialog({ kind: 'brief' })}>
            View project brief →
          </button>
        </div>
      </section>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'board'} className={tab === 'board' ? 'on' : ''} onClick={() => setTab('board')}>
            Board
          </button>
          <button role="tab" aria-selected={tab === 'timeline'} className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>
            Timeline
          </button>
        </div>
        <div className="toolbar-right">
          <Select label="Assignee" value={assignee} options={['All', ...assignees]} onChange={setAssignee} />
          <Select label="Filter" value={category} options={['All', ...CATEGORIES]} onChange={setCategory} />
          <button className="chip-btn add-task" onClick={() => setDialog({ kind: 'task', status: 'todo' })}>
            <PlusIcon width={12} height={12} /> Add task
          </button>
        </div>
      </div>

      {tab === 'board' ? (
        <div className="columns">
          {COLUMNS.map((col) => {
            const items = visible.filter((t) => t.status === col.id);
            return (
              <section
                key={col.id}
                className={`column${overCol === col.id ? ' over' : ''}`}
                aria-label={col.label}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(col.id);
                }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <header className="column-head">
                  <span className="dot">●</span>
                  <span className="column-title">{col.label}</span>
                  <span className="column-count">{items.length}</span>
                  <button className="column-add" onClick={() => setDialog({ kind: 'task', status: col.id })} aria-label={`Add task to ${col.label}`}>
                    ＋
                  </button>
                </header>
                {items.map((t) => (
                  <TaskCard key={t.id} task={t} onMove={move} onDelete={remove} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} />
                ))}
                {items.length === 0 && <div className="empty">No tasks</div>}
              </section>
            );
          })}
        </div>
      ) : (
        <Timeline tasks={[...visible].sort((a, b) => a.due.localeCompare(b.due))} />
      )}

      <div className="page-foot">
        <span>Grounded in your workspace: {project.documents.length} project documents + connected music data.</span>
        <span>Demo campaign · All dates in 2026</span>
      </div>

      <div className="data-actions">
        <button className="link-btn" onClick={downloadCsv}>
          Download tasks as CSV
        </button>
        <button className="link-btn" onClick={resetToFile}>
          Reset board to saved file
        </button>
      </div>

      {dialog?.kind === 'task' && (
        <NewTaskDialog
          assignees={assignees}
          status={dialog.status}
          onClose={() => setDialog(null)}
          onCreate={(t) => {
            setTasks((ts) => [...ts, t]);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'brief' && (
        <Modal title={project.name} onClose={() => setDialog(null)}>
          <p className="modal-text">
            {formatRange(project.start, project.end)} · {assignees.join(', ')}.
          </p>
          <div className="modal-label">Linked documents</div>
          <ul className="doc-list">
            {project.documents.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Modal>
      )}
      {dialog?.kind === 'project' && (
        <Modal title="New project" onClose={() => setDialog(null)}>
          <p className="modal-text">
            This is a demo workspace with a single example campaign, so new projects can’t be created yet. Add tasks to {project.name} to try the board.
          </p>
          <div className="modal-actions">
            <button className="btn-solid btn-small" onClick={() => setDialog(null)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="select" ref={ref}>
      <button className="chip-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {value === 'All' ? label : `${label}: ${value}`}
        <ChevronDown width={11} height={11} />
      </button>
      {open && (
        <div className="select-menu" role="listbox">
          {options.map((o) => (
            <button
              key={o}
              role="option"
              aria-selected={o === value}
              className={o === value ? 'on' : ''}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onMove: (id: string, s: Status) => void;
  onDelete: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const isDone = task.status === 'done';
  return (
    <article className="card" draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="card-top">
        <span className={`card-cat${task.category === 'Audience' ? ' accent' : ''}`}>{task.category.toUpperCase()}</span>
        <div className="card-menu" ref={ref}>
          <button className="dots" onClick={() => setOpen((o) => !o)} aria-label={`Actions for ${task.title}`} aria-haspopup="menu" aria-expanded={open}>
            ···
          </button>
          {open && (
            <div className="select-menu right" role="menu">
              {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                <button
                  key={c.id}
                  role="menuitem"
                  onClick={() => {
                    onMove(task.id, c.id);
                    setOpen(false);
                  }}
                >
                  Move to {c.label}
                </button>
              ))}
              <button role="menuitem" className="danger" onClick={() => onDelete(task.id)}>
                Delete task
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="card-title">{task.title}</div>
      <div className="card-note">{task.note}</div>
      <div className="card-rule" />
      <div className="card-meta">
        <span className={isDone ? 'accent' : ''}>
          {isDone && <span className="check">✓  </span>}
          {task.assignee} · {formatDue(task.due)}
        </span>
        {task.priority && <span className="accent priority">↑ {task.priority}</span>}
      </div>
    </article>
  );
}

function Timeline({ tasks }: { tasks: Task[] }) {
  const label: Record<Status, string> = { todo: 'To do', progress: 'In progress', done: 'Done' };
  return (
    <div className="timeline">
      {tasks.map((t) => (
        <div className="timeline-row" key={t.id}>
          <span className="timeline-date">{formatDue(t.due)}</span>
          <span className="timeline-dot" />
          <div className="timeline-body">
            <div className="card-title">{t.title}</div>
            <div className="card-note">
              {t.category} · {t.assignee} · {label[t.status]}
            </div>
          </div>
        </div>
      ))}
      {tasks.length === 0 && <div className="empty">No tasks match these filters</div>}
    </div>
  );
}

function NewTaskDialog({ assignees, status, onClose, onCreate }: { assignees: string[]; status: Status; onClose: () => void; onCreate: (t: Task) => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [assignee, setAssignee] = useState(assignees[0] ?? '');
  const [due, setDue] = useState('2026-11-30');
  const [col, setCol] = useState<Status>(status);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      id: `t${Date.now()}`,
      title: title.trim(),
      category,
      assignee,
      due,
      status: col,
      note: 'Added manually',
    });
  };

  return (
    <Modal title="Add task" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Title
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Book the launch photographer" />
        </label>
        <div className="form-row">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {assignees.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Due
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label>
            Column
            <select value={col} onChange={(e) => setCol(e.target.value as Status)}>
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-solid btn-small" disabled={!title.trim()}>
            Add task
          </button>
        </div>
      </form>
    </Modal>
  );
}
