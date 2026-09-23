import { containsSkill, normalize, safeUrl, skillCatalog, type Job, type ProfileId, type Role, type SourceStatus } from './model';

export type FetchResult = { source: string; jobs: Job[]; error?: string };

const htmlEntities: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };
const headers = { Accept: 'application/json, application/rss+xml, application/xml, text/xml, text/html;q=0.8', 'User-Agent': 'BuscaVagas/1.0 personal job search aggregator' };

export const sourceStatuses: SourceStatus[] = [
  { name: 'Remotive', automatic: true, available: true, message: 'API pública com vagas remotas. Cache de seis horas.', docs: 'https://github.com/remotive-com/remote-jobs-api', homepage: 'https://remotive.com' },
  { name: 'Himalayas', automatic: true, available: true, message: 'API pública sem chave para vagas remotas, incluindo tecnologia e design.', docs: 'https://himalayas.app/api', homepage: 'https://himalayas.app/jobs' },
  { name: 'Remote OK', automatic: true, available: true, message: 'Feed JSON público. Exige crédito e link direto para a vaga.', docs: 'https://remoteok.com/faq', homepage: 'https://remoteok.com' },
  { name: 'We Work Remotely', automatic: true, available: true, message: 'RSS público por categoria. Exige atribuição e link de volta.', docs: 'https://weworkremotely.com/remote-job-rss-feed', homepage: 'https://weworkremotely.com' },
  { name: 'FrontendBR', automatic: true, available: true, message: 'Issues públicas do GitHub para vagas front-end no Brasil.', docs: 'https://github.com/frontendbr/vagas', homepage: 'https://github.com/frontendbr/vagas/issues' },
  { name: 'LinkedIn', automatic: true, available: false, message: 'API de vagas restrita a contas empresariais/parceiros aprovados.', docs: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access', homepage: 'https://www.linkedin.com/jobs' },
  { name: 'Indeed', automatic: true, available: false, message: 'Console e APIs só ficam disponíveis para parceiros aprovados.', docs: 'https://docs.indeed.com/', homepage: 'https://br.indeed.com' },
  { name: 'Vagas, Revelo, InfoJobs, GeekHunter, Programathor e similares', automatic: false, available: false, message: 'Sem API pública confirmada para busca pessoal; use importação manual para analisar anúncios.', docs: 'https://www.vagas.com.br/', homepage: 'https://www.vagas.com.br/' },
  { name: 'Freelancer/marketplaces', automatic: false, available: false, message: 'Upwork, Fiverr, Freelancer e Arc dependem de conta, termos próprios ou fluxo de projeto, não de feed simples de vagas CLT/PJ.', docs: 'https://www.upwork.com/', homepage: 'https://www.upwork.com/' },
];

export function linkedinSearchUrl(profileId: ProfileId) {
  const q = profileId === 'milena' ? 'designer UI UX junior' : 'desenvolvedor frontend full stack';
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent('São Paulo, Brasil')}`;
}

export function indeedSearchUrl(profileId: ProfileId) {
  const q = profileId === 'milena' ? 'designer UI UX junior' : 'desenvolvedor frontend full stack';
  return `https://br.indeed.com/jobs?q=${encodeURIComponent(q)}&l=S%C3%A3o+Paulo%2C+SP`;
}

export async function fetchAutomaticSources(): Promise<FetchResult[]> {
  const results = await Promise.allSettled([
    fetchRemotiveJobs(),
    fetchHimalayasJobs(),
    fetchRemoteOkJobs(),
    fetchWeWorkRemotelyJobs(),
    fetchFrontendBrJobs(),
  ]);
  return ['Remotive', 'Himalayas', 'Remote OK', 'We Work Remotely', 'FrontendBR'].map((source, index) => {
    const result = results[index];
    return result.status === 'fulfilled' ? { source, jobs: result.value } : { source, jobs: [], error: result.reason instanceof Error ? result.reason.message : 'Falha na coleta.' };
  });
}

export function dedupeJobs(jobs: Job[]) {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = normalize(`${job.source}|${job.url || job.id}|${job.company}|${job.title}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));
}

export async function fetchRemotiveJobs() {
  const upstream = await fetch('https://remotive.com/api/remote-jobs', { signal: AbortSignal.timeout(25000), headers });
  if (!upstream.ok) throw new Error('A Remotive está indisponível.');
  const data = await upstream.json() as { jobs: { id: number; title: string; company_name: string; candidate_required_location: string; description: string; url: string; salary: string; publication_date: string }[] };
  if (!Array.isArray(data.jobs)) throw new Error('A Remotive retornou dados inesperados.');
  return data.jobs.map(item => {
    const description = cleanText(item.description);
    return toJob({
      id: `remotive-${item.id}`,
      title: item.title,
      company: item.company_name,
      location: item.candidate_required_location || 'Remoto',
      description,
      url: item.url,
      source: 'Remotive',
      published: item.publication_date,
      salary: item.salary || 'Salário não informado',
    });
  }).filter(isCompatibleJob);
}

async function fetchHimalayasJobs() {
  const queries = ['react', 'frontend', 'full stack', 'ui ux', 'product design'];
  const pages = await Promise.all(queries.map(async query => {
    const url = `https://himalayas.app/jobs/api/search?query=${encodeURIComponent(query)}&page=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers });
    if (!response.ok) throw new Error('A Himalayas está indisponível.');
    return await response.json() as { jobs: { title: string; companyName: string; excerpt?: string; description?: string; url?: string; slug?: string; applicationLink?: string; minSalary?: number | null; maxSalary?: number | null; currency?: string; seniority?: string[]; locationRestrictions?: string[]; categories?: string[]; postedAt?: string; pubDate?: string; date?: string }[] };
  }));
  return pages.flatMap(page => page.jobs || []).map((item, index) => {
    const description = cleanText(item.description || item.excerpt || '');
    const salary = item.minSalary || item.maxSalary ? `${item.currency || 'USD'} ${item.minSalary || ''}${item.minSalary && item.maxSalary ? ' - ' : ''}${item.maxSalary || ''}` : 'Salário não informado';
    return toJob({
      id: `himalayas-${item.slug || normalize(`${item.companyName}-${item.title}-${index}`).replace(/\W+/g, '-')}`,
      title: item.title,
      company: item.companyName,
      location: (item.locationRestrictions || []).slice(0, 4).join(', ') || 'Remoto mundial',
      description,
      url: item.url || item.applicationLink || `https://himalayas.app/jobs/${item.slug || ''}`,
      source: 'Himalayas',
      published: item.postedAt || item.pubDate || item.date || new Date().toISOString(),
      salary,
      level: levelFrom(`${item.title} ${(item.seniority || []).join(' ')}`),
    });
  }).filter(isCompatibleJob);
}

async function fetchRemoteOkJobs() {
  const response = await fetch('https://remoteok.com/api', { signal: AbortSignal.timeout(25000), headers });
  if (!response.ok) throw new Error('A Remote OK está indisponível.');
  const data = await response.json() as ({ id?: string | number; position?: string; company?: string; location?: string; tags?: string[]; description?: string; url?: string; apply_url?: string; date?: string; epoch?: number; salary_min?: number; salary_max?: number } | { legal: string })[];
  return data.filter((item): item is Exclude<typeof item, { legal: string }> => 'position' in item).map(item => {
    const salary = item.salary_min || item.salary_max ? `USD ${item.salary_min || ''}${item.salary_min && item.salary_max ? ' - ' : ''}${item.salary_max || ''}` : 'Salário não informado';
    return toJob({
      id: `remoteok-${item.id}`,
      title: item.position || '',
      company: item.company || 'Empresa não informada',
      location: item.location || 'Remoto',
      description: cleanText(item.description || ''),
      url: item.url || item.apply_url || '',
      source: 'Remote OK',
      published: item.date || (item.epoch ? new Date(item.epoch * 1000).toISOString() : new Date().toISOString()),
      salary,
      tags: item.tags || [],
    });
  }).filter(isCompatibleJob);
}

async function fetchWeWorkRemotelyJobs() {
  const feeds = [
    'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
    'https://weworkremotely.com/categories/remote-design-jobs.rss',
  ];
  const xmls = await Promise.all(feeds.map(async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers });
    if (!response.ok) throw new Error('A We Work Remotely está indisponível.');
    return await response.text();
  }));
  return xmls.flatMap(parseRssItems).map((item, index) => {
    const [company, ...title] = item.title.split(':');
    return toJob({
      id: `wwr-${normalize(item.link || item.title || String(index)).replace(/\W+/g, '-')}`,
      title: title.join(':').trim() || item.title,
      company: title.length ? company.trim() : 'Empresa não informada',
      location: item.region || 'Remoto',
      description: cleanText(item.description),
      url: item.link,
      source: 'We Work Remotely',
      published: item.pubDate || new Date().toISOString(),
    });
  }).filter(isCompatibleJob);
}

async function fetchFrontendBrJobs() {
  const response = await fetch('https://api.github.com/repos/frontendbr/vagas/issues?state=open&per_page=80', { signal: AbortSignal.timeout(25000), headers });
  if (!response.ok) throw new Error('O GitHub FrontendBR está indisponível.');
  const data = await response.json() as { id: number; number: number; title: string; body: string; html_url: string; created_at: string; labels?: { name: string }[] }[];
  return data.filter(issue => !/aten[cç][aã]o|leia nossas regras|regras/i.test(issue.title) && !(issue.labels || []).some(label => /aviso|aten[cç][aã]o/i.test(label.name))).map(issue => toJob({
    id: `frontendbr-${issue.number}`,
    title: issue.title,
    company: companyFromIssue(issue.title, issue.body),
    location: locationFrom(issue.title, issue.body),
    description: cleanText(issue.body || issue.title),
    url: issue.html_url,
    source: 'FrontendBR',
    published: issue.created_at,
    tags: (issue.labels || []).map(label => label.name),
  })).filter(job => isCompatibleJob(job) && job.role !== 'UI/UX');
}

function toJob(input: { id: string; title: string; company: string; location: string; description: string; url: string; source: string; published: string; salary?: string; tags?: string[]; level?: string }): Job {
  const fullText = `${input.title} ${input.description} ${(input.tags || []).join(' ')}`;
  const role = roleFrom(fullText) || 'Front-end';
  const tags = [...new Set([...(input.tags || []), ...skillCatalog.filter(skill => containsSkill(fullText, skill))])].slice(0, 10);
  return {
    id: input.id,
    title: input.title.trim().slice(0, 200),
    company: input.company.trim().slice(0, 200) || 'Empresa não informada',
    location: normalizeLocation(input.location, input.description),
    mode: modeFrom(input.location, input.description),
    role,
    level: input.level || levelFrom(fullText),
    tags,
    salary: input.salary || 'Salário não informado',
    description: input.description.trim().slice(0, 30000) || input.title,
    url: safeUrl(input.url),
    source: input.source,
    published: input.published || new Date().toISOString(),
  };
}

function isCompatibleJob(job: Job) {
  if (!job.url) return false;
  if (!roleFrom(`${job.title} ${job.description} ${job.tags.join(' ')}`)) return false;
  if (!['Front-end', 'Full Stack', 'UI/UX'].includes(job.role)) return false;
  if (job.mode !== 'Remoto' && !/sao paulo|sp\b|são paulo/i.test(normalize(`${job.location} ${job.description}`))) return false;
  const region = normalize(`${job.location} ${job.description}`);
  if (job.mode === 'Remoto' && /(us only|usa only|united states only|canada only|europe only|eu only|uk only|apac only)/.test(region)) return false;
  return true;
}

function roleFrom(text: string): Role | null {
  const value = normalize(text);
  if (/\b(ui|ux|product designer|product design|designer|figma|design system|research)\b/.test(value) && !/front.?end|full.?stack|react|angular|vue/.test(value)) return 'UI/UX';
  if (/full.?stack|fullstack/.test(value)) return 'Full Stack';
  if (/front.?end|frontend|react|vue|angular|typescript|javascript|css|html/.test(value)) return 'Front-end';
  return null;
}

function levelFrom(text: string) {
  const value = normalize(text);
  if (/senior|\bsr\b|lead|staff|principal/.test(value)) return 'Sênior';
  if (/junior|\bjr\b|entry|intern|estagio|estagiario|trainee/.test(value)) return 'Júnior';
  if (/mid|pleno|intermediate/.test(value)) return 'Pleno';
  return 'Não informada';
}

function modeFrom(location: string, description: string): Job['mode'] {
  const value = normalize(`${location} ${description}`);
  if (/hibrid|hybrid/.test(value)) return 'Híbrido';
  if (/presencial|on.?site/.test(value)) return 'Presencial';
  return 'Remoto';
}

function normalizeLocation(location: string, description: string) {
  const value = `${location} ${description}`;
  if (/s[aã]o paulo|sp\b/i.test(value) && /hibrid|hybrid/i.test(value)) return 'São Paulo, SP';
  return cleanText(location).slice(0, 160) || 'Remoto';
}

function cleanText(value: string) {
  return decodeHtml(value || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

function decodeHtml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&([a-zA-Z]+|#\d+);/g, (_, entity: string) => {
    if (entity.startsWith('#')) return String.fromCharCode(Number(entity.slice(1)));
    return htmlEntities[entity] || `&${entity};`;
  });
}

function parseRssItems(xml: string) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => {
    const item = match[1];
    return {
      title: pickXml(item, 'title'),
      link: pickXml(item, 'link'),
      description: pickXml(item, 'description'),
      pubDate: pickXml(item, 'pubDate'),
      region: pickXml(item, 'region'),
    };
  });
}

function pickXml(xml: string, tag: string) {
  return decodeHtml(xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '').trim();
}

function locationFrom(title: string, body: string) {
  const text = `${title}\n${body}`;
  if (/remoto|remote/i.test(text)) return 'Remoto';
  const bracket = title.match(/\[([^\]]+)\]/)?.[1];
  if (bracket) return bracket;
  if (/s[aã]o paulo|sp\b/i.test(text)) return 'São Paulo, SP';
  return 'Brasil';
}

function companyFromIssue(title: string, body: string) {
  const fromTitle = title.match(/\b(?:na|no|@)\s+\[?([^\]\n]+)/i)?.[1] || title.match(/-\s*([^-\]]+)$/)?.[1];
  if (fromTitle) return fromTitle.trim().slice(0, 80);
  const fromBody = body.match(/empresa[:\s]+([^\n]+)/i)?.[1];
  return (fromBody || 'Empresa via FrontendBR').trim().slice(0, 80);
}
