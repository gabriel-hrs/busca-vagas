# Busca Vagas

Aplicação web responsiva para organizar a busca de Gabriel (Front-end / Full Stack) e Milena (UI/UX júnior). Interface em português, com perfis, favoritos, candidaturas, coleta de vagas remotas, análise de competências e currículo adaptado.

## Executar

Requer Node.js 22.13+ e npm.

```sh
npm install
npm run dev
```

Acesse o endereço exibido pelo servidor. Na rede local, use o endereço IP do notebook com a porta exibida para acessar pelo celular; os dois devem estar na mesma rede. O modo de desenvolvimento dispensa login e compartilha o espaço local. Não exponha o servidor de desenvolvimento à internet.

Para testar o bloqueio de login localmente, use:

```sh
npm run dev:secure
```

Nesse modo, requisições sem identidade autenticada retornam erro de login, como em produção. A publicação privada no Sites injeta os headers de usuário autenticado.

```sh
npm test
npm run typecheck
npm run build
```


## GitHub Pages

A pasta `docs/` contém o `index.html` estático para que `https://gabriel-hrs.github.io/busca-vagas/` abra uma tela de acesso em vez do README. Como o GitHub Pages só serve HTML, CSS e JavaScript, o envio e a validação de código usam Supabase Auth direto no navegador.

No GitHub, configure **Settings > Pages > Build and deployment > Source** como **GitHub Actions**. O workflow `.github/workflows/pages.yml` gera `docs/auth-config.js` durante o deploy usando Secrets do repositório.

Crie estes Secrets em **GitHub > Settings > Secrets and variables > Actions**:

- `SUPABASE_URL`: Project URL do Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: Publishable key do Supabase.
- `APP_URL`: opcional. Se ficar vazio, o Pages abre `./app.html`, a versão protegida estática com vagas, currículo e compatibilidade. Use outro valor apenas se quiser redirecionar para um app com backend publicado em outro endereço. Não use `localhost` nesse Secret para produção.

Para testar localmente a mesma home estática do GitHub Pages, copie o exemplo de configuração:

```sh
cp docs/auth-config.example.js docs/auth-config.js
```

Edite `docs/auth-config.js` localmente. Esse arquivo está no `.gitignore` e não deve ser commitado.

Depois rode:

```sh
npm run pages:dev
```

Acesse `http://localhost:8080/`. Após validar o código, o login abre `http://localhost:8080/app.html`, a versão protegida estática com vagas, currículo e compatibilidade. Se quiser testar a versão com backend local, rode `npm run dev` em outro terminal e configure `appUrl: 'http://localhost:3000/'` no `docs/auth-config.js` local.

Para ativar o login por código de e-mail:

1. Crie um projeto no Supabase.
2. Em **Authentication > Providers > Email**, mantenha o provedor de e-mail ativo.
3. Em **Authentication > Users**, crie manualmente os usuários autorizados.
4. Em **Authentication > URL Configuration**, configure a URL do site como `https://gabriel-hrs.github.io/busca-vagas/`. Para teste local, adicione `http://localhost:8080/` em **Redirect URLs**.
5. Em **Authentication > Emails > Templates**, abra o template **Magic Link** e troque o corpo para incluir o código numérico. Exemplo mínimo:

   ```html
   <h2>Seu código de acesso</h2>
   <p>Digite este código no Busca Vagas:</p>
   <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
   <p>Este código expira em breve e só pode ser usado uma vez.</p>
   ```

   Se o template usar `{{ .ConfirmationURL }}`, o e-mail vai mandar um link de login em vez do código/token para digitar na tela.
6. Copie a **Project URL** e a **Publishable key** em **Project Settings > API Keys**.
7. Para produção, salve `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` como Secrets do GitHub Actions. `APP_URL` é opcional: deixe sem criar para abrir `./app.html` no próprio GitHub Pages, ou crie se quiser redirecionar para outro app publicado. Se ele estiver como `http://localhost:3000/`, o workflow troca automaticamente para `./app.html`. Para teste local, copie `docs/auth-config.example.js` para `docs/auth-config.js` e preencha `supabaseUrl`, `supabasePublishableKey` e `appUrl`. A Publishable key é pública e própria para frontend; não coloque Secret key no GitHub Pages.

O formulário usa `shouldCreateUser: false`, então ele não cria conta nova a partir da página pública. O código só deve ser enviado para e-mails já cadastrados no Supabase. Após validar o token, `index.html` redireciona direto para a tela principal de vagas configurada em `appUrl`; por padrão, ela é `./app.html`.

O GitHub Pages continua não executando banco D1 nem rotas `/api`. Por isso, `docs/app.html` é uma versão estática protegida: currículo e vagas salvas ficam no navegador, e a coleta automática depende de APIs públicas acessíveis pelo browser. Para recursos com banco e endpoints privados, publique também a versão com backend e configure `APP_URL` para ela.

## Como usar

1. Selecione Gabriel ou Milena e abra **Meu currículo**.
2. Cole o texto do currículo ou importe um `.txt`; informe apenas competências reais.
3. Clique em **Atualizar vagas** para coletar oportunidades das fontes automáticas disponíveis.
4. Para vagas de outros portais, use **Adicionar vaga** com link e descrição.
5. Abra a oportunidade para ver a compatibilidade, salvar, anotar e acompanhar a candidatura.
6. Use **Adaptar currículo**, revise o texto e baixe uma versão `.txt`.

Os anúncios de demonstração são fictícios e identificados como tais. Não representam ofertas reais nem podem ser usados para candidatura.

## Coleta e fontes

- **Remotive:** integração real com API pública, cache persistente por seis horas, vagas Front-end, Full Stack e UI/UX com localização declarada Brasil, América Latina, América do Sul ou mundial. A API publica com atraso de 24 horas. Sempre é necessário confirmar restrições e validade no anúncio original. Crédito e link da Remotive são preservados.
- **Himalayas:** integração por API pública sem chave para vagas remotas de tecnologia e design. O link original e a atribuição da fonte são preservados.
- **Remote OK:** integração por feed JSON público. O app preserva crédito e link direto para a vaga, conforme exigência da fonte.
- **We Work Remotely:** integração por RSS oficial de programação, front-end, full stack e design. O app preserva atribuição e link de volta.
- **FrontendBR:** integração por GitHub Issues públicas do repositório `frontendbr/vagas`, útil para vagas brasileiras de front-end.
- **LinkedIn:** não há coleta automática nesta versão porque o acesso oficial de Jobs é restrito a desenvolvedores aprovados pelo LinkedIn Talent Solutions. O app exibe o status da fonte, a documentação oficial e o atalho de busca por perfil.
- **Indeed:** não há coleta automática nesta versão porque as APIs oficiais dependem de credenciais provisionadas pelo Partner Console da Indeed. O app exibe o status da fonte, a documentação oficial e o atalho de busca por perfil.
- **Vagas.com, Revelo, InfoJobs, Vulpi, GeekHunter, Programathor, Upwork, Fiverr, Freelancer e similares:** ficam como importação manual enquanto não houver API pública/autorizada adequada para busca pessoal. O sistema não faz scraping agressivo nem contorna login, parceria, paywall ou anti-bot.
- A coleta acontece automaticamente ao abrir a aplicação se o cache tiver mais de seis horas, ou ao usar **Atualizar vagas**. Não há execução agendada quando a aplicação está fechada.
- MCP não é necessário para a coleta por API. Não há servidor MCP conectado nesta versão.

Documentação oficial: [Remotive](https://github.com/remotive-com/remote-jobs-api), [LinkedIn](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access), [Indeed](https://docs.indeed.com/).

## Compatibilidade e adaptação

O índice é a porcentagem de competências reconhecidas no anúncio que também aparecem no currículo ou na lista de habilidades declaradas. Usa um catálogo de competências e aliases, com correspondência textual. Não é uma avaliação semântica de experiência, idiomas ou senioridade e não é probabilidade de contratação.

A adaptação é determinística, sem serviço pago de IA: define o objetivo da candidatura, destaca competências comuns e mantém todo o texto original. Não inventa experiências, datas, formação ou conhecimentos. A edição final é feita pelo usuário. Importação de PDF/DOCX e reescrita semântica por LLM não estão implementadas; copie o texto do documento para o campo do currículo.

## Arquitetura e dados

React 19, TypeScript, vinext/Vite e Cloudflare Workers. O banco D1 armazena perfis, anúncios adicionados, favoritos, etapas, anotações e snapshots dos currículos gerados. `.openai/hosting.json` declara o binding lógico `DB`; o banco local fica em `.wrangler/`, ignorado pelo Git. Migração em `drizzle/`.

Dados pessoais são separados por identidade autenticada do Sites e perfil selecionado. O ambiente local tem uma identidade de desenvolvimento. Publicação privada usa autenticação do Sites; os endpoints de produção rejeitam requisições sem identidade e restringem acesso às contas autorizadas. Os perfis Gabriel e Milena são personas dentro do espaço de uma conta, não contas independentes; uma publicação privada do proprietário não concede automaticamente acesso à conta da Milena.

## Segurança de acesso

O app mantém uma lista de contas autorizadas por hash SHA-256 do e-mail autenticado, sem exibir e-mail completo na interface. A tela de login usa código por e-mail via Supabase Auth; não há envio por SMS nesta versão.

Vagas salvas têm um snapshot para continuarem acessíveis após expirar do feed. Currículos inseridos localmente não são incluídos no código nem enviados na publicação. A versão adaptada preserva o currículo-base; alterações feitas no editor de exportação ficam apenas no arquivo baixado.

## Próximas integrações

LinkedIn, Indeed e portais fechados podem virar conectores automáticos quando houver credenciais oficiais compatíveis com o caso de uso. Até lá, o sistema usa API pública, RSS oficial, GitHub Issues públicas e importação manual. Não são necessários segredos para Remotive, Himalayas, Remote OK, We Work Remotely ou FrontendBR. Uma implantação compartilhada entre duas contas requer configurar acesso e modelo de compartilhamento; não torne o espaço público para compartilhar currículos.
