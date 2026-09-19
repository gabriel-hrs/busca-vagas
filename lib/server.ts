import { env } from 'cloudflare:workers';
import { profiles, type Workspace } from './model';
export function owner(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  if (id) return id;
  if (import.meta.env.DEV) return 'local-workspace';
  throw new Error('AUTH_REQUIRED');
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
  const feed = await db.prepare('SELECT value, updated_at FROM feeds WHERE source = ?').bind('remotive').first<{value: string; updated_at: string}>();
  const state: Workspace = { profiles: profiles.map(p => ({ ...p })), jobs: feed ? JSON.parse(feed.value) : [], actions: {}, lastSync: feed?.updated_at || null };
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
  return Response.json({ error: message === 'AUTH_REQUIRED' ? 'Entre na sua conta para acessar seus dados.' : message }, { status: message === 'AUTH_REQUIRED' ? 401 : message === 'INVALID_ORIGIN' ? 403 : 400 });
}
