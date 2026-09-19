export type ProfileId = 'gabriel' | 'milena';
export type Mode = 'Remoto' | 'Híbrido' | 'Presencial';
export type Role = 'Front-end' | 'Full Stack' | 'UI/UX';
export type Profile = { id: ProfileId; name: string; headline: string; resume: string; skills: string; seniority: string };
export type Job = { id: string; title: string; company: string; location: string; mode: Mode; role: Role; level: string; tags: string[]; salary: string; description: string; url: string; source: string; published: string; demo?: boolean };
export type Stage = 'Salva' | 'Candidatura enviada' | 'Entrevista' | 'Proposta' | 'Encerrada';
export type Action = { saved: boolean; stage: Stage; notes: string };
export type Workspace = { profiles: Profile[]; jobs: Job[]; actions: Record<string, Action>; lastSync: string | null };
export const profiles: Profile[] = [
  { id: 'gabriel', name: 'Gabriel', headline: 'Desenvolvedor Front-end / Full Stack', resume: '', skills: '', seniority: 'Todas' },
  { id: 'milena', name: 'Milena', headline: 'Designer UI/UX Júnior', resume: '', skills: '', seniority: 'Júnior' },
];
export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const skillCatalog = ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Vue', 'Angular', 'HTML', 'CSS', 'Node.js', 'Python', 'SQL', 'PostgreSQL', 'Git', 'Docker', 'AWS', 'Figma', 'UI', 'UX', 'Design System', 'Prototipação', 'Pesquisa', 'Acessibilidade', 'Testes', 'Tailwind', 'GraphQL', 'REST', 'Scrum'];
const aliases: Record<string, string[]> = {
  'Next.js': ['nextjs', 'next.js', 'next js'], 'Node.js': ['nodejs', 'node.js', 'node js'],
  'Prototipação': ['prototipacao', 'prototyping', 'prototipos'], 'Pesquisa': ['pesquisa', 'research'],
  'Acessibilidade': ['acessibilidade', 'accessibility', 'wcag'], 'Testes': ['testes', 'testing', 'jest', 'vitest', 'cypress'],
  'Design System': ['design system', 'design systems'], 'React': ['react', 'reactjs', 'react.js'],
};
export function containsSkill(text: string, skill: string) {
  const haystack = normalize(text);
  return (aliases[skill] || [normalize(skill)]).some(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(haystack);
  });
}
export function assess(job: Job, profile: Profile) {
  const evidence = `${profile.resume}\n${profile.skills}`;
  const requirements = [...new Set([...job.tags, ...skillCatalog.filter(s => containsSkill(job.description, s))])];
  const matched = requirements.filter(s => containsSkill(evidence, s));
  const missing = requirements.filter(s => !containsSkill(evidence, s));
  return { score: evidence.trim() && requirements.length ? Math.round(matched.length / requirements.length * 100) : null, matched, missing, requirements };
}
export function tailor(job: Job, profile: Profile) {
  const { matched, missing } = assess(job, profile);
  if (!profile.resume.trim()) throw new Error('Cadastre seu currículo-base antes de adaptar.');
  const text = [profile.name, profile.headline, '', `OBJETIVO: ${job.title} — ${job.company}`, '', ...(matched.length ? ['COMPETÊNCIAS ALINHADAS À VAGA', matched.join(' • '), ''] : []), 'TRAJETÓRIA, FORMAÇÃO E INFORMAÇÕES DO CURRÍCULO-BASE', profile.resume.trim()].join('\n');
  return { text, matched, missing };
}
export function profileFits(job: Job, profile: Profile) {
  if (profile.id === 'milena') return job.role === 'UI/UX' && !['Pleno', 'Sênior'].includes(job.level);
  return job.role !== 'UI/UX';
}
export function safeUrl(value: string) {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
