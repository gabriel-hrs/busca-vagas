# generate-resume-ai

Edge Function do Supabase que gera um currículo otimizado por vaga usando a OpenAI API sem expor a chave no GitHub Pages.

## Secrets necessários

No projeto Supabase, configure:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-6-astra
```

`OPENAI_MODEL` é opcional. Se não existir, a função usa `gpt-6-astra`.

## Deploy

```bash
supabase functions deploy generate-resume-ai
```

A função usa o JWT do Supabase enviado pelo frontend e valida somente as contas autorizadas do Busca Vagas.
