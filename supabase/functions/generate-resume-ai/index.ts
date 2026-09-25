const allowedOrigins = new Set([
  'https://gabriel-hrs.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

const allowedEmailHashes = new Set([
  '79236d53e4d8b03650380e117e9fbf6e2bf6de2e02945a2e48225725f9cc8921',
  'd5a6101ef761af2034e6ce117b517f56bd0958eb55afc8a3ef733972f4163e39',
]);

type ResumeRequest = {
  profileName?: string;
  role?: string;
  resume?: string;
  job?: {
    title?: string;
    company?: string;
    role?: string;
    level?: string;
    mode?: string;
    location?: string;
    salary?: string;
    tags?: string[];
    description?: string;
  };
};

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://gabriel-hrs.github.io';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status: number, request: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.trim().toLowerCase()));
  return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function trimText(value: unknown, max: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function supabasePublishableKey() {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
    return typeof keys.default === 'string' ? keys.default : Object.values(keys).find(value => typeof value === 'string') as string | undefined;
  } catch {
    return undefined;
  }
}

async function authenticatedEmail(request: Request) {
  const auth = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = supabasePublishableKey();
  if (!auth || !supabaseUrl || !publishableKey) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: publishableKey },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.email === 'string' ? user.email : null;
}

function buildPrompt(payload: Required<ResumeRequest>) {
  const job = payload.job;
  return `Você é especialista em recrutamento tech no Brasil e otimização ética de currículos ATS.

Tarefa: reescrever o currículo-base para a vaga abaixo, aumentando aderência sem inventar fatos.

Regras obrigatórias:
- Use somente experiências, empresas, cargos, formação, datas, ferramentas e resultados que estejam no currículo-base.
- Não invente certificações, idiomas, senioridade, métricas, empresas, datas ou tecnologias.
- Se a vaga pedir algo ausente no currículo-base, coloque em "pontos_atencao", sem inserir como experiência.
- Priorize clareza, ATS, palavras-chave verdadeiras e português profissional.
- Preserve a identidade como ${payload.profileName} e o foco em ${payload.role}.
- Retorne APENAS JSON válido, sem markdown.

Formato JSON exato:
{
  "resume": "currículo completo otimizado em texto editável",
  "summary": "resumo curto do ajuste feito",
  "matched_keywords": ["palavras-chave reais usadas"],
  "attention_points": ["lacunas ou cuidados para revisão"]
}

Vaga:
Título: ${trimText(job.title, 160)}
Empresa: ${trimText(job.company, 120)}
Área: ${trimText(job.role, 80)}
Senioridade: ${trimText(job.level, 80)}
Modalidade/local: ${trimText(`${job.mode} - ${job.location}`, 140)}
Tags detectadas: ${(job.tags || []).map(tag => trimText(tag, 40)).join(', ')}
Descrição: ${trimText(job.description, 12000)}

Currículo-base:
${trimText(payload.resume, 26000)}`;
}

function parseOutputText(data: Record<string, unknown>) {
  if (typeof data.output_text === 'string') return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  const texts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') texts.push(text);
    }
  }
  return texts.join('\n').trim();
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, request);

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) return json({ error: 'OPENAI_API_KEY não configurada na Edge Function.' }, 500, request);

  const email = await authenticatedEmail(request);
  if (!email || !allowedEmailHashes.has(await sha256(email))) {
    return json({ error: 'Usuário não autorizado para gerar currículo com IA.' }, 403, request);
  }

  let body: ResumeRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400, request);
  }

  const payload = {
    profileName: trimText(body.profileName, 80),
    role: trimText(body.role, 120),
    resume: trimText(body.resume, 30000),
    job: {
      title: trimText(body.job?.title, 160),
      company: trimText(body.job?.company, 120),
      role: trimText(body.job?.role, 80),
      level: trimText(body.job?.level, 80),
      mode: trimText(body.job?.mode, 80),
      location: trimText(body.job?.location, 120),
      salary: trimText(body.job?.salary, 80),
      tags: Array.isArray(body.job?.tags) ? body.job.tags.slice(0, 16).map(tag => trimText(tag, 40)) : [],
      description: trimText(body.job?.description, 12000),
    },
  };

  if (!payload.resume || payload.resume.length < 300) return json({ error: 'Importe um currículo-base mais completo antes de usar IA.' }, 400, request);
  if (!payload.job.title || !payload.job.description) return json({ error: 'A vaga precisa de título e descrição para usar IA.' }, 400, request);

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-6-astra';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(payload),
      max_output_tokens: 2600,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ error: 'Falha ao gerar currículo com IA.', details: data?.error?.message || data }, response.status, request);
  }

  const outputText = parseOutputText(data);
  try {
    const parsed = JSON.parse(outputText);
    return json({
      resume: String(parsed.resume || '').trim(),
      summary: String(parsed.summary || '').trim(),
      matchedKeywords: Array.isArray(parsed.matched_keywords) ? parsed.matched_keywords.slice(0, 24).map(String) : [],
      attentionPoints: Array.isArray(parsed.attention_points) ? parsed.attention_points.slice(0, 12).map(String) : [],
      model,
    }, 200, request);
  } catch {
    return json({ resume: outputText, summary: 'A IA retornou texto livre; revise antes de enviar.', matchedKeywords: [], attentionPoints: ['Retorno fora do formato JSON esperado.'], model }, 200, request);
  }
});
