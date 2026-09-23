import { database, owner, checkMutation, failure } from '@/lib/server';
import { dedupeJobs, fetchAutomaticSources, sourceStatuses } from '@/lib/sources';
const summarize = (results: { source: string; jobs: unknown[]; error?: string }[]) => results.map(result => ({ source: result.source, count: result.jobs.length, error: result.error }));
export async function POST(request: Request) {
  try {
    checkMutation(request); owner(request);
    const body = await request.json().catch(() => ({})) as { force?: boolean };
    const db = await database();
    const previous = await db.prepare('SELECT updated_at, value FROM feeds WHERE source = ?').bind('automatic').first<{updated_at: string; value: string}>();
    if (!body.force && previous && Date.now() - Date.parse(previous.updated_at) < 6 * 3600000) {
      const cached = JSON.parse(previous.value) as { jobs: unknown[]; results?: unknown[] };
      const results = (cached.results || []) as { source: string; jobs: unknown[]; error?: string }[];
      return Response.json({ count: cached.jobs.length, cached: true, sources: sourceStatuses, results: summarize(results) });
    }
    const results = await fetchAutomaticSources();
    const jobs = dedupeJobs(results.flatMap(result => result.jobs)).slice(0, 250);
    if (!jobs.length) throw new Error('Nenhuma fonte automática respondeu com vagas compatíveis agora. Tente novamente mais tarde; suas vagas salvas continuam disponíveis.');
    await db.prepare('INSERT INTO feeds (source, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(source) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind('automatic', JSON.stringify({ jobs, results }), new Date().toISOString()).run();
    return Response.json({ count: jobs.length, cached: false, sources: sourceStatuses, results: summarize(results) });
  } catch (e) { return failure(e); }
}
