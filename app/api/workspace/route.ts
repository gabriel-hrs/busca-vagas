import { checkMutation, failure, owner, put, workspace } from '@/lib/server';
import { safeUrl, type Profile, type Job, type Action } from '@/lib/model';
export async function GET(request: Request) {
  try { return Response.json(await workspace(await owner(request)), { headers: { 'Cache-Control': 'private, no-store' } }); } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    checkMutation(request);
    const user = await owner(request);
    if (Number(request.headers.get('content-length') || 0) > 100000) throw new Error('Conteúdo muito grande.');
    const body = await request.json() as { type: string; value: Profile & Job & Action; key: string };
    if (body.type === 'profile') {
      const p = body.value;
      if (!['gabriel', 'milena'].includes(p?.id) || typeof p.resume !== 'string' || p.resume.length > 40000 || typeof p.skills !== 'string' || p.skills.length > 3000 || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100 || typeof p.headline !== 'string' || p.headline.length > 200 || !['Todas', 'Júnior', 'Pleno', 'Sênior'].includes(p.seniority)) throw new Error('Confira os dados do perfil (currículo: até 40 mil caracteres).');
      await put(user, `profile:${p.id}`, { id: p.id, name: p.name.trim(), headline: p.headline, resume: p.resume, skills: p.skills, seniority: p.seniority });
    } else if (body.type === 'action') {
      const a = body.value;
      if (typeof body.key !== 'string' || !/^(gabriel|milena):[\w-]{1,100}$/.test(body.key) || typeof a?.saved !== 'boolean' || !['Salva', 'Candidatura enviada', 'Entrevista', 'Proposta', 'Encerrada'].includes(a.stage) || typeof a.notes !== 'string' || a.notes.length > 5000) throw new Error('Dados de candidatura inválidos.');
      await put(user, `action:${body.key}`, a);
      // Keep a snapshot so saved jobs survive feed expiration and refreshes.
      const id = body.key.split(':')[1];
      if (!id.startsWith('demo-')) {
        const job = (await workspace(user)).jobs.find(j => j.id === id);
        if (job) await put(user, `job:${id}`, job);
      }
    } else if (body.type === 'job') {
      const j = body.value;
      if (!j || typeof j.title !== 'string' || !j.title.trim() || typeof j.company !== 'string' || !j.company.trim() || typeof j.description !== 'string' || j.description.length < 30 || j.description.length > 30000 || !['Remoto', 'Híbrido', 'Presencial'].includes(j.mode) || !['Front-end', 'Full Stack', 'UI/UX'].includes(j.role) || !['Não informada', 'Júnior', 'Pleno', 'Sênior'].includes(j.level) || !safeUrl(j.url)) throw new Error('Preencha título, empresa, link válido e descrição (mínimo de 30 caracteres).');
      const id = `manual-${crypto.randomUUID()}`;
      const job = { id, title: j.title.slice(0, 200), company: j.company.slice(0, 200), description: j.description, mode: j.mode, role: j.role, level: j.level, url: safeUrl(j.url), location: j.mode === 'Remoto' ? 'Brasil' : 'São Paulo, SP', tags: [], salary: typeof j.salary === 'string' && j.salary.trim() ? j.salary.slice(0, 100) : 'Salário a combinar', source: 'Adicionada por você', published: new Date().toISOString() };
      await put(user, `job:${id}`, job);
    } else throw new Error('Operação inválida.');
    return Response.json({ ok: true });
  } catch (e) { return failure(e); }
}
