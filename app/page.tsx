'use client';


import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { ArrowDownUp, ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Code2, Download, FileText, Globe2, LoaderCircle, MapPin, Menu, Moon, Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Target, Upload, Users, WandSparkles, Wifi, X } from 'lucide-react';
import { assess, normalize, profileFits, profiles, safeUrl, tailor, type Action, type Job, type Profile, type ProfileId, type SourceStatus, type Stage, type Workspace } from '@/lib/model';
import { demoJobs } from '@/lib/demo';
import { indeedSearchUrl, linkedinSearchUrl, sourceStatuses } from '@/lib/sources';

type View = 'explore' | 'saved' | 'applications' | 'profile' | 'sources' | 'security';
const stageOptions: Stage[] = ['Salva', 'Candidatura enviada', 'Entrevista', 'Proposta', 'Encerrada'];
const emptyState: Workspace = { profiles, jobs: [], actions: {}, lastSync: null, sources: sourceStatuses };
const defaultAction: Action = { saved: false, stage: 'Salva', notes: '' };
type SecurityState = { account: { profileId: ProfileId; name: string; contacts: { type: 'email'; label: string; verified: boolean }[] } | null; accounts: { profileId: ProfileId; name: string; contacts: { type: 'email'; label: string; verified: boolean }[] }[]; enforcement: { access: string; secondFactor: string } };
const themeKey = 'busca-vagas-theme';
const themeEvent = 'busca-vagas-theme-change';
function getThemeSnapshot(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(themeKey);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function subscribeTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(themeEvent, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(themeEvent, callback);
  };
}
async function api<T = { ok: boolean; count: number; cached: boolean; sources?: SourceStatus[]; results?: { source: string; count: number; error?: string }[] }>(url: string, body?: unknown) {
  const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'wide' : ''}`} onCancel={onClose}><div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
function CompanyMark({ job }: { job: Job }) {
  const color = [...job.company].reduce((n, c) => n + c.charCodeAt(0), 0) % 5;
  return <span aria-hidden="true" className={`company-mark color-${color}`}>{job.company.slice(0, 1).toUpperCase()}</span>;
}

export default function Home() {
  const [state, setState] = useState<Workspace>(emptyState);
  const [active, setActive] = useState<ProfileId>('gabriel');
  const [view, setView] = useState<View>('explore');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('Todas');
  const [level, setLevel] = useState('Todas');
  const [role, setRole] = useState('Todas');
  const [source, setSource] = useState('Todas');
  const [sort, setSort] = useState('compatibility');
  const [demo, setDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Job | null>(null);
  const [resume, setResume] = useState<{text: string; missing: string[]; matched: string[]} | null>(null);
  const [adding, setAdding] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [filters, setFilters] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => 'light');
  const profile = state.profiles.find(p => p.id === active)!;
  const load = useCallback(async () => {
    const data: Workspace = await api<Workspace>('/api/workspace'); setState(data); return data;
  }, []);
  const loadSecurity = useCallback(async () => {
    try { setSecurity(await api<SecurityState>('/api/security')); }
    catch (e) { setNotice((e as Error).message); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const data = await load();
        if (cancelled) return;
        setLevel(data.profiles.find(p => p.id === 'gabriel')?.seniority || 'Todas');
        if (data.lastSync || data.jobs.length) setDemo(false);
        setLoading(false);
        if (!data.lastSync || Date.now() - Date.parse(data.lastSync) >= 6 * 3600000) {
          setSyncing(true);
          try { await api('/api/sync', {}); if (!cancelled) { await load(); setDemo(false); } }
          catch (e) { if (!cancelled) setNotice((e as Error).message); }
          finally { if (!cancelled) setSyncing(false); }
        }
      } catch (e) { if (!cancelled) { setNotice((e as Error).message); if ((e as Error).message.includes('Entre na sua conta')) setAuthError(true); } }
      finally { if (!cancelled) setLoading(false); }
    }
    void initialize();
    return () => { cancelled = true; };
  }, [load]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 7500); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const navigate = (next: View) => { setView(next); setSidebar(false); if (next === 'security') void loadSecurity(); };
  const toggleTheme = () => {
    localStorage.setItem(themeKey, theme === 'dark' ? 'light' : 'dark');
    window.dispatchEvent(new Event(themeEvent));
  };
  const switchProfile = (id: ProfileId) => { setActive(id); setLevel(state.profiles.find(p => p.id === id)?.seniority || 'Todas'); setRole('Todas'); setSelected(null); setResume(null); };
  const actionFor = (job: Job) => state.actions[`${active}:${job.id}`] || defaultAction;
  const pool = demo ? demoJobs : state.jobs;
  const relevant = pool.filter(j => profileFits(j, profile));
  const savedCount = [...state.jobs, ...demoJobs].filter(j => profileFits(j, profile) && actionFor(j).saved).length;
  const appliedCount = [...state.jobs, ...demoJobs].filter(j => profileFits(j, profile) && actionFor(j).stage !== 'Salva').length;
  const highCount = relevant.filter(j => (assess(j, profile).score || 0) >= 70).length;
  let jobs = (view === 'saved' || view === 'applications' ? [...state.jobs, ...demoJobs].filter(j => profileFits(j, profile)) : relevant).filter(j => {
    if (view === 'saved' && !actionFor(j).saved) return false;
    if (view === 'applications' && actionFor(j).stage === 'Salva') return false;
    return normalize(`${j.title} ${j.company} ${j.tags.join(' ')} ${j.description}`).includes(normalize(query)) && (mode === 'Todas' || j.mode === mode) && (level === 'Todas' || j.level === level) && (role === 'Todas' || j.role === role) && (source === 'Todas' || j.source === source);
  });
  jobs = [...jobs].sort((a, b) => sort === 'compatibility' ? (assess(b, profile).score ?? -1) - (assess(a, profile).score ?? -1) : (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));
  const resetFilters = () => { setQuery(''); setMode('Todas'); setLevel('Todas'); setRole('Todas'); setSource('Todas'); };
  async function sync() {
    setSyncing(true);
    try { const result = await api('/api/sync', { force: true }); await load(); setDemo(false); const active = (result.results || []).filter(r => r.count).map(r => `${r.source} (${r.count})`).join(', '); const failed = (result.results || []).filter(r => r.error).map(r => r.source).join(', '); setNotice(`${result.count} vagas coletadas${active ? `: ${active}` : ''}. ${failed ? `Fontes sem resposta agora: ${failed}.` : ''} ${result.cached ? 'Cache de seis horas em uso.' : 'Busca atualizada!'}`); }
    catch (e) { setNotice((e as Error).message); } finally { setSyncing(false); }
  }
  async function saveAction(job: Job, patch: Partial<Action>) {
    if (busy) return;
    setBusy(true);
    const key = `${active}:${job.id}`; const value = { ...actionFor(job), ...patch };
    try { await api('/api/workspace', { type: 'action', key, value }); setState(s => ({ ...s, actions: { ...s.actions, [key]: value } })); setNotice('Atualização salva.'); }
    catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }
  async function generate(job: Job) {
    if (!profile.resume.trim()) { setSelected(null); navigate('profile'); setNotice('Adicione seu currículo-base para criar uma versão adaptada.'); return; }
    setBusy(true);
    try { setResume(await api<ReturnType<typeof tailor>>('/api/resume', { profileId: active, jobId: job.id })); setSelected(job); }
    catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }
  const navItems = [
    { id: 'explore' as View, label: 'Explorar vagas', icon: Search },
    { id: 'saved' as View, label: 'Vagas salvas', icon: Bookmark, count: savedCount },
    { id: 'applications' as View, label: 'Candidaturas', icon: BriefcaseBusiness, count: appliedCount },
    { id: 'profile' as View, label: 'Meu currículo', icon: FileText },
  ];
  return <div className="app-shell">
    {sidebar && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setSidebar(false)} />}
    <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
      <button className="brand" aria-label="Busca Vagas início" onClick={() => navigate('explore')}><span className="brand-icon"><Search size={22} strokeWidth={2.6} /></span><span>busca<span className="brand-light">vagas</span><span className="brand-dot">.</span></span></button>
      <div className="workspace-label">SEU ESPAÇO DE OPORTUNIDADES</div>
      <nav aria-label="Navegação principal">{navItems.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}><item.icon size={19} /><span>{item.label}</span>{!!item.count && <span className="nav-count">{item.count}</span>}</button>)}</nav>
      <div className="sidebar-divider" /><span className="sidebar-section-label">PREFERÊNCIAS</span>
      <button className={`nav-item ${view === 'sources' ? 'active' : ''}`} onClick={() => navigate('sources')}><Globe2 size={19} /><span>Fontes de vagas</span><span className="status-dot" /></button>
      <button className="nav-item" onClick={() => navigate('profile')}><Settings2 size={19} /><span>Meu perfil</span></button>
      <button className={`nav-item ${view === 'security' ? 'active' : ''}`} onClick={() => navigate('security')}><ShieldCheck size={19} /><span>Segurança</span></button>
      <div className="sidebar-bottom"><div className="little-note"><div className="note-icon"><Sparkles size={18} /></div><strong>Seu talento, no lugar certo.</strong><p>Um próximo passo de cada vez.<br />A gente ajuda no caminho.</p><button onClick={() => navigate('profile')}>Completar meu perfil <ArrowUpRight size={15} /></button></div>
      <div className="sidebar-profile"><span className={`avatar ${active}`}>{profile.name.slice(0, 1)}</span><div><strong>{profile.name}</strong><small>Espaço pessoal</small></div><button className="icon-button" aria-label="Editar meu perfil" onClick={() => navigate('profile')}><Settings2 size={17} /></button></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setSidebar(true)}><Menu size={21} /></button><span>Meu espaço</span><ChevronRight size={14} /><strong>{view === 'sources' ? 'Fontes de vagas' : view === 'security' ? 'Segurança' : navItems.find(n => n.id === view)?.label}</strong></div><div className="topbar-right"><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} aria-pressed={theme === 'dark'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><span className="private-label"><ShieldCheck size={15} /> Espaço privado</span><div className="top-profile"><span className={`avatar tiny ${active}`}>{profile.name[0]}</span><select aria-label="Selecionar perfil" value={active} onChange={e => switchProfile(e.target.value as ProfileId)}>{state.profiles.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select><ChevronDown size={14} /></div></div></header>
      <main>
        {authError && <div className="notice-banner">Entre para acessar seus currículos e suas vagas. <a href="/signin-with-chatgpt?return_to=/">Entrar com ChatGPT <ArrowRight size={15} /></a></div>}
        {(view === 'explore' || view === 'saved' || view === 'applications') && <>
          <section className="page-heading"><div><div className="eyebrow"><span /> SUA CARREIRA EM MOVIMENTO</div><h1>{view === 'explore' ? <>Menos procura.<br className="mobile-break" /> Mais possibilidades<span>.</span></> : view === 'saved' ? <>Suas próximas possibilidades<span>.</span></> : <>Cada passo conta<span>.</span></>}</h1><p>{view === 'explore' ? `Olá, ${profile.name}. Encontre oportunidades que combinam com o seu próximo passo.` : view === 'saved' ? 'As oportunidades que você guardou, prontas para o próximo passo.' : 'Acompanhe suas candidaturas e mantenha tudo no mesmo lugar.'}</p></div><button className="button secondary refresh-button" onClick={sync} disabled={syncing || loading}><RefreshCw size={16} className={syncing ? 'spinning' : ''} />{syncing ? 'Buscando vagas...' : 'Atualizar vagas'}</button></section>
          <div className="profile-tabs" role="group" aria-label="Perfis de busca">{state.profiles.map(p => <button key={p.id} className={`profile-tab ${active === p.id ? 'selected' : ''}`} onClick={() => switchProfile(p.id)}><span className={`avatar small ${p.id}`}>{p.name[0]}</span><strong>{p.name}</strong><span className="profile-tab-description">{p.id === 'gabriel' ? 'Front-end & Full Stack' : 'UI/UX Designer · Júnior'}</span>{active === p.id && <Check size={15} />}</button>)}<span className="profiles-hint"><Users size={14} /> Dois perfis, novos caminhos</span></div>
          <div className="stats-grid"><div className="stat-card"><div><span>Vagas para você</span><strong>{relevant.length.toString().padStart(2, '0')}</strong><small>{demo ? 'Exemplos para explorar' : 'Dentro das suas áreas de interesse'}</small></div><span className="stat-icon violet"><BriefcaseBusiness size={21} /></span></div><div className="stat-card"><div><span>Alta compatibilidade</span><strong>{profile.resume || profile.skills ? highCount.toString().padStart(2, '0') : '—'}<span className="tiny-badge">70% ou mais</span></strong><small>{profile.resume || profile.skills ? 'Competências alinhadas ao seu perfil' : 'Adicione seu currículo para descobrir'}</small></div><span className="stat-icon green"><Target size={22} /></span></div><div className="stat-card"><div><span>Vagas salvas</span><strong>{savedCount.toString().padStart(2, '0')}</strong><small>Boas oportunidades para revisitar</small></div><span className="stat-icon peach"><Bookmark size={21} /></span></div></div>
          {!profile.resume && <div className="resume-callout"><span className="callout-icon"><WandSparkles size={24} /></span><div><strong>O próximo match começa com você.</strong><p>Adicione seu currículo e descubra a compatibilidade com cada vaga.</p></div><button onClick={() => navigate('profile')}>Adicionar currículo <ArrowRight size={17} /></button></div>}
          <section className="jobs-section"><div className="section-heading"><div><h2>{view === 'explore' ? 'Oportunidades para você' : view === 'saved' ? 'Sua seleção de vagas' : 'Suas candidaturas'}<span>{jobs.length}</span></h2><p>{view === 'applications' ? 'Atualize cada etapa nos detalhes da vaga.' : 'Seu talento merece encontrar o lugar certo.'}</p></div><button className="text-button" onClick={() => setAdding(true)}><Plus size={17} /> Adicionar vaga</button></div>
          <div className="search-bar"><Search size={19} /><input aria-label="Buscar cargo, empresa ou tecnologia" placeholder="Busque por cargo, empresa ou tecnologia..." value={query} onChange={e => setQuery(e.target.value)} /><span className="search-location"><MapPin size={16} /> São Paulo + remoto</span><button className="filter-toggle" aria-label="Mostrar filtros" aria-expanded={filters} onClick={() => setFilters(!filters)}><SlidersHorizontal size={18} /></button></div>
          <div className={`filter-row ${filters ? 'expanded' : ''}`}><div className="filter-controls"><label className="filter-select"><Wifi size={14} /><select aria-label="Modalidade" value={mode} onChange={e => setMode(e.target.value)}><option value="Todas">Modalidade</option>{['Remoto', 'Híbrido', 'Presencial'].map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={12} /></label><label className="filter-select"><BriefcaseBusiness size={14} /><select aria-label="Senioridade" value={level} onChange={e => setLevel(e.target.value)}><option value="Todas">Senioridade</option>{['Júnior', 'Pleno', 'Sênior', 'Não informada'].map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={12} /></label><label className="filter-select"><Code2 size={14} /><select aria-label="Área de atuação" value={role} onChange={e => setRole(e.target.value)}><option value="Todas">Área de atuação</option>{(active === 'gabriel' ? ['Front-end', 'Full Stack'] : ['UI/UX']).map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={12} /></label><label className="filter-select"><Globe2 size={14} /><select aria-label="Fonte" value={source} onChange={e => setSource(e.target.value)}><option value="Todas">Todas as fontes</option>{[...new Set(pool.map(j => j.source))].map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={12} /></label>{(query || mode !== 'Todas' || level !== 'Todas' || role !== 'Todas' || source !== 'Todas') && <button className="text-button subtle" onClick={resetFilters}>Limpar</button>}</div><label className="sort-select"><ArrowDownUp size={14} /><select aria-label="Ordenação" value={sort} onChange={e => setSort(e.target.value)}><option value="compatibility">Mais compatíveis</option><option value="recent">Mais recentes</option></select><ChevronDown size={12} /></label></div>
          {view === 'explore' && <div className="data-label"><span className={`status-dot ${demo ? 'amber' : ''}`} /><span>{demo ? 'Modo demonstração · empresas e vagas fictícias' : `Vagas reais · ${state.lastSync ? `fonte atualizada em ${new Date(state.lastSync).toLocaleDateString('pt-BR')}` : 'adicione vagas ou atualize a busca'}`}</span><button onClick={() => { setDemo(!demo); setSource('Todas'); }}>{demo ? 'Ver vagas reais' : 'Explorar demonstração'} <ArrowRight size={12} /></button></div>}
          {loading ? <div className="empty"><LoaderCircle className="spinning" /><h3>Preparando seu espaço...</h3></div> : jobs.length ? <div className="jobs-grid">{jobs.map(job => { const match = assess(job, profile); const action = actionFor(job); return <article className="job-card" key={job.id}><div className="job-top"><div className="company"><CompanyMark job={job} /><div><strong>{job.company}</strong><span>{job.demo ? 'Vaga de exemplo' : job.source}</span></div></div><button disabled={busy} className={`bookmark-button ${action.saved ? 'saved' : ''}`} aria-label={action.saved ? `Remover ${job.title} das salvas` : `Salvar ${job.title}`} aria-pressed={action.saved} onClick={() => saveAction(job, { saved: !action.saved })}><Bookmark size={19} fill={action.saved ? 'currentColor' : 'none'} /></button></div><button className="job-title" onClick={() => { setSelected(job); setResume(null); }}><h3>{job.title}</h3></button><div className="job-meta"><span><MapPin size={14} />{job.location}</span><span className={job.mode === 'Remoto' ? 'mode-remote' : ''}>{job.mode === 'Remoto' && <Wifi size={12} />}{job.mode}</span><span>{job.level}</span></div><p className="job-description">{job.description}</p><div className="tags">{job.tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div><div className="job-salary">{job.salary}</div>{action.stage !== 'Salva' && <div className="application-stage"><CheckCheck size={13} />{action.stage}</div>}<div className="job-footer"><span className={`match ${match.score === null ? 'pending' : match.score >= 70 ? 'high' : 'medium'}`} title="Percentual das competências da vaga encontradas no currículo e nas habilidades declaradas."><Sparkles size={15} />{match.score === null ? 'Descubra seu match' : `${match.score}% de compatibilidade`}</span><button onClick={() => { setSelected(job); setResume(null); }}>Ver vaga <ArrowUpRight size={15} /></button></div></article>; })}</div> : <div className="empty"><Search size={30} /><h3>{view === 'saved' ? 'Sua próxima oportunidade favorita está por aí.' : view === 'applications' ? 'Tudo começa com uma candidatura.' : 'Vamos encontrar seu próximo passo?'}</h3><p>{view === 'explore' ? 'Atualize a busca, adicione uma vaga ou ajuste seus filtros.' : 'Explore as vagas e use os detalhes para salvar ou acompanhar uma candidatura.'}</p><button className="button primary" onClick={() => { resetFilters(); if (view !== 'explore') navigate('explore'); else sync(); }}>{view === 'explore' ? 'Buscar vagas reais' : 'Explorar vagas'}<ArrowRight size={16} /></button></div>}
          <div className="list-footer"><ShieldCheck size={14} /><span>Compatibilidade por competências. Seu currículo-base sempre preservado.</span><span className="footer-count">{jobs.length} {jobs.length === 1 ? 'oportunidade' : 'oportunidades'}</span></div></section>
        </>}
        {view === 'profile' && <ProfileEditor key={active} profile={profile} onSwitch={switchProfile} onSave={async p => { await api('/api/workspace', { type: 'profile', value: p }); await load(); setLevel(p.seniority); setNotice('Currículo salvo. A compatibilidade das vagas foi recalculada.'); }} />}
        {view === 'sources' && <Sources profile={profile} lastSync={state.lastSync} sources={state.sources} syncing={syncing} onSync={sync} onAdd={() => setAdding(true)} />}
        {view === 'security' && <SecurityPanel data={security} onRefresh={loadSecurity} />}
        <footer className="page-footer"><span>buscavagas<span>.</span></span><p>Menos abas abertas. Mais caminhos pela frente.</p><button onClick={() => navigate('sources')}><CircleHelp size={14} /> Como funciona</button></footer>
      </main>
    </div>
    {notice && <div className="toast" role="status"><span>{notice}</span><button className="icon-button" aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {adding && <AddJob onClose={() => setAdding(false)} onSave={async value => { await api('/api/workspace', { type: 'job', value }); await load(); setDemo(false); setAdding(false); resetFilters(); navigate('explore'); setNotice('Vaga adicionada! A compatibilidade já está disponível.'); }} />}
    {selected && <Dialog title={resume ? 'Seu currículo, para esta oportunidade' : 'Detalhes da oportunidade'} onClose={() => { setSelected(null); setResume(null); }} wide>{resume ? <div className="dialog-body"><div className="notice-banner"><ShieldCheck size={18} /><span>Adaptação por competências: objetivo e habilidades em destaque, sem inventar experiências. Revise antes de enviar.</span></div><textarea className="resume-output" aria-label="Currículo adaptado editável" value={resume.text} onChange={e => setResume({ ...resume, text: e.target.value })} />{!!resume.missing.length && <p className="muted">Não identificadas no seu perfil: {resume.missing.join(', ')}. Só inclua se tiver experiência real.</p>}<div className="dialog-actions"><button className="button secondary" onClick={() => setResume(null)}>Voltar à vaga</button><button className="button primary" onClick={() => download(resume.text, `${profile.name}-curriculo-${selected.id}.txt`)}><Download size={16} /> Baixar currículo (.txt)</button></div></div> : <JobDetails job={selected} profile={profile} action={actionFor(selected)} busy={busy} onSave={patch => saveAction(selected, patch)} onGenerate={() => generate(selected)} />}</Dialog>}
  </div>;
}

function ProfileEditor({ profile, onSwitch, onSave }: { profile: Profile; onSwitch: (id: ProfileId) => void; onSave: (p: Profile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); try { await onSave(draft); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } }
  return <><section className="page-heading"><div><div className="eyebrow"><span /> SEU PONTO DE PARTIDA</div><h1>O seu próximo passo tem a sua cara<span>.</span></h1><p>Conte sua trajetória. A gente conecta suas competências às oportunidades.</p></div></section><div className="profile-tabs"><button className={`profile-tab ${profile.id === 'gabriel' ? 'selected' : ''}`} onClick={() => onSwitch('gabriel')}><span className="avatar small gabriel">G</span>Gabriel</button><button className={`profile-tab ${profile.id === 'milena' ? 'selected' : ''}`} onClick={() => onSwitch('milena')}><span className="avatar small milena">M</span>Milena</button></div><div className="profile-layout"><form className="panel profile-form" onSubmit={submit}><h2>Meu perfil e currículo</h2><p className="muted">Esses dados são a base de todas as suas análises.</p><div className="form-grid"><label>Nome<input required maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>Senioridade<select value={draft.seniority} onChange={e => setDraft({ ...draft, seniority: e.target.value })}>{['Todas', 'Júnior', 'Pleno', 'Sênior'].map(v => <option key={v}>{v}</option>)}</select></label></div><label>Título profissional<input maxLength={200} value={draft.headline} onChange={e => setDraft({ ...draft, headline: e.target.value })} /></label><label>Competências que você já utiliza<input maxLength={3000} placeholder={profile.id === 'gabriel' ? 'Ex.: React, TypeScript, HTML, CSS...' : 'Ex.: Figma, pesquisa, prototipação...'} value={draft.skills} onChange={e => setDraft({ ...draft, skills: e.target.value })} /></label><div className="field-heading"><label htmlFor="resume-base">Currículo-base</label><button className="text-button" type="button" onClick={() => file.current?.click()}><Upload size={15} /> Importar .txt</button></div><input type="file" accept=".txt,text/plain" ref={file} hidden onChange={async e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 160000) { setError('Use um arquivo de até 160 KB.'); return; } const content = await f.text(); if (content.length > 40000) { setError('O currículo deve ter até 40 mil caracteres.'); return; } setDraft({ ...draft, resume: content }); }} /><textarea id="resume-base" maxLength={40000} rows={15} placeholder="Cole aqui seu currículo: contato, resumo, experiências, projetos, formação, ferramentas e idiomas. Preserve datas e resultados reais." value={draft.resume} onChange={e => setDraft({ ...draft, resume: e.target.value })} /><small className="muted">Você pode copiar o texto do seu PDF ou Word e colar aqui.</small>{error && <p className="error" role="alert">{error}</p>}<button className="button primary" disabled={saving}><Check size={16} />{saving ? 'Salvando...' : 'Salvar perfil e currículo'}</button></form><aside><div className="panel guide-panel"><span className="stat-icon violet"><WandSparkles size={23} /></span><h3>Seu currículo trabalha com você.</h3><p>Ao abrir uma vaga, você encontra:</p><ul><li><Check size={16} /> Competências em comum</li><li><Check size={16} /> Requisitos ainda não identificados</li><li><Check size={16} /> Uma versão com objetivo e habilidades alinhados à vaga</li></ul><div className="guide-note"><ShieldCheck size={18} /><p>Experiências, empresas, datas e formação não são inventadas. A versão original fica preservada.</p></div></div><div className="panel guide-panel"><MapPin size={21} /><h3>Seu radar de oportunidades</h3><p>Remoto com elegibilidade para o Brasil, híbrido ou presencial em São Paulo.</p><p>{profile.id === 'milena' ? 'UI/UX júnior. Vagas com senioridade não informada também podem aparecer; confira a descrição.' : 'Desenvolvimento Front-end e Full Stack.'}</p></div></aside></div></>;
}

function JobDetails({ job, profile, action, busy, onSave, onGenerate }: { job: Job; profile: Profile; action: Action; busy: boolean; onSave: (p: Partial<Action>) => void; onGenerate: () => void }) {
  const match = assess(job, profile); const [notes, setNotes] = useState(action.notes);
  const preview = profile.resume.trim() ? tailor(job, profile) : null;
  return <div className="dialog-body"><div className="detail-title"><CompanyMark job={job} /><div><span className="muted">{job.company}</span><h2>{job.title}</h2></div></div><div className="tags"><span>{job.mode}</span><span>{job.location}</span><span>{job.level}</span><span>{job.salary}</span></div>{job.demo && <div className="notice-banner">Esta é uma vaga fictícia para experimentar o sistema. Não é possível se candidatar.</div>}<section className="match-panel"><div><Sparkles size={21} /><h3>{match.score === null ? 'Adicione seu currículo para ver a compatibilidade' : `${match.score}% de compatibilidade por competências`}</h3></div><p>Proporção das competências identificadas na descrição que aparecem no seu currículo e nas habilidades declaradas. Não representa chance de contratação.</p><div className="match-columns"><div><strong>Você já tem em comum</strong><div className="tags green-tags">{match.matched.length ? match.matched.map(t => <span key={t}><Check size={12} />{t}</span>) : <small>Nenhuma competência identificada ainda.</small>}</div></div><div><strong>Vale conferir</strong><div className="tags">{match.missing.length ? match.missing.map(t => <span key={t}>{t}</span>) : <small>{match.requirements.length ? 'Todas as competências identificadas aparecem no seu perfil.' : 'Nenhuma competência reconhecida automaticamente.'}</small>}</div></div></div></section><h3>Sobre a oportunidade</h3><p className="full-description">{job.description}</p>{!job.demo && <p className="muted">Fonte: <a href={safeUrl(job.url)} target="_blank" rel="noreferrer">{job.source}</a>. Confirme elegibilidade, idioma, localização e disponibilidade no anúncio original.</p>}<section className="adapt-section"><WandSparkles size={22} /><div><h3>Um currículo para esta vaga</h3><p>{preview ? `Versão preparada com ${preview.matched.length} competências em destaque e sua trajetória preservada.` : 'Cadastre seu currículo-base para destacar experiências e competências reais.'}</p></div><button className="button primary" disabled={busy} onClick={onGenerate}>Adaptar currículo <ArrowRight size={15} /></button></section><div className="form-grid"><label>Etapa da candidatura<select aria-label="Etapa da candidatura" value={action.stage} disabled={busy} onChange={e => onSave({ stage: e.target.value as Stage, saved: true })}>{stageOptions.map(s => <option key={s}>{s}</option>)}</select></label><label>Anotações<textarea rows={2} maxLength={5000} placeholder="Contato, prazo, próximos passos..." value={notes} onChange={e => setNotes(e.target.value)} /></label></div><div className="dialog-actions"><button className="button secondary" disabled={busy} onClick={() => onSave({ saved: true, notes })}><Bookmark size={15} /> Salvar vaga e notas</button>{!job.demo && <a className="button primary" href={safeUrl(job.url)} target="_blank" rel="noreferrer">Abrir anúncio original <ArrowUpRight size={16} /></a>}</div></div>;
}

function Sources({ profile, lastSync, sources, syncing, onSync, onAdd }: { profile: Profile; lastSync: string | null; sources: SourceStatus[]; syncing: boolean; onSync: () => void; onAdd: () => void }) {
  const linkFor = (source: SourceStatus) => source.name === 'LinkedIn' ? linkedinSearchUrl(profile.id) : source.name === 'Indeed' ? indeedSearchUrl(profile.id) : source.homepage;
  return <><section className="page-heading"><div><div className="eyebrow"><span /> AMPLIE SEU RADAR</div><h1>Boas oportunidades, reunidas<span>.</span></h1><p>Fontes de vagas e atalhos de busca para o seu perfil.</p></div><button disabled={syncing} className="button secondary refresh-button" onClick={onSync}><RefreshCw size={16} className={syncing ? 'spinning' : ''} />{syncing ? 'Buscando...' : 'Atualizar fontes'}</button></section><div className="sources-grid">{sources.map(source => <article className="panel source-card" key={source.name}><div className="source-icon">{source.name === 'LinkedIn' ? 'in' : source.name.slice(0, 1).toLowerCase()}</div><span className={`integration-badge ${source.available ? '' : 'neutral'}`}>{source.available ? 'Coleta automática' : source.automatic ? 'Acesso restrito' : 'Manual'}</span><h2>{source.name}</h2><p>{source.available ? 'Entra automaticamente no radar de vagas compatíveis.' : 'Pode ser usada por atalho ou importação manual quando encontrar uma vaga interessante.'}</p><small>{source.message}</small>{source.available ? <><button disabled={syncing} className="button primary" onClick={onSync}><RefreshCw size={16} className={syncing ? 'spinning' : ''} />{syncing ? 'Buscando...' : 'Atualizar'}</button>{lastSync && <small>Última coleta: {new Date(lastSync).toLocaleString('pt-BR')}</small>}</> : <button className="text-button" onClick={onAdd}><Plus size={15} /> Adicionar uma vaga</button>}<a className="button secondary" href={linkFor(source)} target="_blank" rel="noreferrer">Abrir fonte <ArrowUpRight size={16} /></a><a href={source.docs} target="_blank" rel="noreferrer">Documentação ou site <ArrowUpRight size={13} /></a></article>)}</div><div className="panel explanation"><Globe2 size={25} /><div><h3>Critério de integração</h3><p>O Busca Vagas prioriza API pública, RSS oficial e GitHub Issues públicas. Isso cobre Remotive, Himalayas, Remote OK, We Work Remotely e FrontendBR sem conta empresarial.</p><p>Sites com login, parceria, assinatura, marketplace fechado ou anti-bot ficam como importação manual até existir uma API autorizada para sua conta.</p></div></div></>;
}

function SecurityPanel({ data, onRefresh }: { data: SecurityState | null; onRefresh: () => void }) {
  return <><section className="page-heading"><div><div className="eyebrow"><span /> ACESSO PROTEGIDO</div><h1>Segurança da conta<span>.</span></h1><p>Contas autorizadas, métodos de verificação mascarados e próximos passos antes da publicação.</p></div><button className="button secondary refresh-button" onClick={onRefresh}><RefreshCw size={16} /> Atualizar status</button></section><div className="security-layout"><section className="panel security-panel"><span className="stat-icon green"><ShieldCheck size={23} /></span><h2>Acesso em produção</h2><p className="muted">{data?.enforcement.access || 'Carregando configuração de segurança...'}</p><div className="security-list">{(data?.accounts || []).map(account => <article key={account.profileId} className={`security-account ${data?.account?.profileId === account.profileId ? 'current' : ''}`}><div><strong>{account.name}</strong><small>{data?.account?.profileId === account.profileId ? 'Conta autenticada atual' : 'Conta autorizada'}</small></div>{account.contacts.map(contact => <span key={`${account.profileId}-${contact.type}`} className="security-chip"><ShieldCheck size={12} />E-mail · {contact.label}</span>)}</article>)}</div></section><aside className="panel guide-panel"><span className="stat-icon violet"><ShieldCheck size={23} /></span><h3>Login por e-mail</h3><p>{data?.enforcement.secondFactor || 'E-mails cadastrados com dados sensíveis mascarados.'}</p><ul><li><Check size={16} /> E-mails completos não aparecem na interface</li><li><Check size={16} /> Produção bloqueia contas não autorizadas</li><li><Check size={16} /> Código enviado por e-mail</li></ul><div className="guide-note"><ShieldCheck size={18} /><p>O login público usa Supabase Auth com código por e-mail. Não há envio por SMS nesta versão.</p></div></aside></div></>;
}
function AddJob({ onClose, onSave }: { onClose: () => void; onSave: (value: Record<string, string>) => Promise<void> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const value = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>; setBusy(true); try { await onSave(value); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <Dialog title="Uma nova oportunidade no seu radar" onClose={onClose}><form className="dialog-body" onSubmit={submit}><p className="muted">Copie as informações do anúncio para analisar a compatibilidade e adaptar seu currículo.</p><label>Link do anúncio<input required type="url" name="url" placeholder="https://..." /></label><div className="form-grid"><label>Título da vaga<input name="title" required maxLength={200} placeholder="Desenvolvedor Front-end" /></label><label>Empresa<input name="company" required maxLength={200} placeholder="Nome da empresa" /></label></div><div className="form-grid"><label>Área<select name="role"><option>Front-end</option><option>Full Stack</option><option>UI/UX</option></select></label><label>Modalidade<select name="mode"><option>Remoto</option><option>Híbrido</option><option>Presencial</option></select></label></div><small className="muted">Vagas híbridas e presenciais adicionadas aqui devem ser em São Paulo.</small><div className="form-grid"><label>Senioridade<select name="level"><option>Não informada</option><option>Júnior</option><option>Pleno</option><option>Sênior</option></select></label><label>Remuneração (opcional)<input name="salary" placeholder="Ex.: R$ 5.000 – R$ 7.000" maxLength={100} /></label></div><label>Descrição completa<textarea name="description" required minLength={30} maxLength={30000} rows={7} placeholder="Cole os requisitos, atividades, benefícios e demais informações do anúncio..." /></label>{error && <p className="error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}><Plus size={16} />{busy ? 'Adicionando...' : 'Adicionar e analisar'}</button></div></form></Dialog>;
}
