import { database, owner, checkMutation, failure } from '@/lib/server';
import { normalize, safeUrl, skillCatalog, containsSkill, type Job } from '@/lib/model';
export async function POST(request: Request) {
  try {
    checkMutation(request); owner(request);
    const db = await database();
    const previous = await db.prepare('SELECT updated_at, value FROM feeds WHERE source = ?').bind('remotive').first<{updated_at: string; value: string}>();
    if (previous && Date.now() - Date.parse(previous.updated_at) < 6 * 3600000) return Response.json({ count: JSON.parse(previous.value).length, cached: true });
    const upstream = await fetch('https://remotive.com/api/remote-jobs', { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' } });
    if (!upstream.ok) throw new Error('A Remotive está indisponível. Tente novamente mais tarde; suas vagas continuam salvas.');
    const data = await upstream.json() as { jobs: { id: number; title: string; company_name: string; candidate_required_location: string; description: string; url: string; salary: string; publication_date: string }[] };
    if (!Array.isArray(data.jobs)) throw new Error('A fonte retornou dados inesperados.');
    const jobs: Job[] = [];
    for (const item of data.jobs) {
      const title = normalize(item.title);
      const region = normalize(item.candidate_required_location || '');
      if (!/worldwide|anywhere|brazil|brasil|latin america|latam|south america/.test(region)) continue;
      const design = /\b(ui|ux|product design|interface design)/.test(title);
      const full = /full.?stack/.test(title);
      const front = /front.?end|react|vue|angular/.test(title);
      if (!design && !full && !front) continue;
      const description = item.description.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
      const url = safeUrl(item.url);
      if (!url) continue;
      jobs.push({ id: `remotive-${item.id}`, title: item.title, company: item.company_name, location: item.candidate_required_location, mode: 'Remoto', role: design ? 'UI/UX' : full ? 'Full Stack' : 'Front-end', level: /senior|\bsr\b|lead|staff|principal/.test(title) ? 'Sênior' : /junior|\bjr\b|entry/.test(title) ? 'Júnior' : /mid|pleno|intermediate/.test(title) ? 'Pleno' : 'Não informada', tags: skillCatalog.filter(s => containsSkill(`${item.title} ${description}`, s)).slice(0, 10), salary: item.salary || 'Salário não informado', description, url, source: 'Remotive', published: item.publication_date });
    }
    await db.prepare('INSERT INTO feeds (source, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(source) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind('remotive', JSON.stringify(jobs), new Date().toISOString()).run();
    return Response.json({ count: jobs.length, cached: false });
  } catch (e) { return failure(e); }
}
