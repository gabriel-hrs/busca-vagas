import { env } from 'cloudflare:workers';
import { profiles, type Job, type Workspace } from './model';
import { authenticatedAccount } from './security';
import { sourceStatuses } from './sources';
export async function owner(request: Request) {
  return (await authenticatedAccount(request)).owner;
}
export function checkMutation(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new Error('INVALID_ORIGIN');
}
export async function database() {
  const db = env.DB;
  if (!db) throw new Error('Armazenamento indisponível.');
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS records (owner TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (owner, key))'),
    db.prepare('CREATE TABLE IF NOT EXISTS feeds (source TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL)'),
  ]);
  return db;
}
export async function workspace(user: string): Promise<Workspace> {
  const db = await database();
  const rows = await db.prepare('SELECT key, value FROM records WHERE owner = ?').bind(user).all<{ key: string; value: string }>();
  const feedRows = await db.prepare('SELECT source, value, updated_at FROM feeds').all<{source: string; value: string; updated_at: string}>();
  const jobs: Job[] = [];
  let lastSync: string | null = null;
  for (const feed of feedRows.results) {
    const value = JSON.parse(feed.value);
    const feedJobs = Array.isArray(value) ? value : Array.isArray(value.jobs) ? value.jobs : [];
    jobs.push(...feedJobs);
    if (!lastSync || Date.parse(feed.updated_at) > Date.parse(lastSync)) lastSync = feed.updated_at;
  }
  const state: Workspace = { profiles: profiles.map(p => ({ ...p })), jobs, actions: {}, lastSync, sources: sourceStatuses };
  for (const row of rows.results) {
    const value = JSON.parse(row.value);
    if (row.key.startsWith('profile:')) state.profiles = state.profiles.map(p => p.id === value.id ? value : p);
    if (row.key.startsWith('job:') && !state.jobs.some(j => j.id === value.id)) state.jobs.push(value);
    if (row.key.startsWith('action:')) state.actions[row.key.slice(7)] = value;
  }
  return state;
}
export async function put(user: string, key: string, value: unknown) {
  const db = await database();
  await db.prepare('INSERT INTO records (owner, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(owner, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(user, key, JSON.stringify(value), new Date().toISOString()).run();
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
  return Response.json({ error: message === 'AUTH_REQUIRED' ? 'Entre na sua conta para acessar seus dados.' : message === 'ACCESS_DENIED' ? 'Esta conta não está autorizada a acessar o Busca Vagas.' : message }, { status: message === 'AUTH_REQUIRED' ? 401 : message === 'ACCESS_DENIED' || message === 'INVALID_ORIGIN' ? 403 : 400 });
}
