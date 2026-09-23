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

A raiz do repositório contém um `index.html` estático para que `https://gabriel-hrs.github.io/busca-vagas/` abra uma capa de login em vez do README. Essa capa não executa autenticação real, coleta de vagas, banco D1 nem rotas `/api`; o GitHub Pages só serve arquivos estáticos.

Use o GitHub Pages como página pública de entrada/documentação. Para usar o Busca Vagas completo com login seguro, publique a aplicação em um ambiente com backend e autenticação privada.

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

O app mantém uma lista de contas autorizadas por hash SHA-256 do e-mail autenticado, sem exibir e-mail ou telefone completos na interface. A tela **Segurança** mostra apenas métodos mascarados, como `996****47` e e-mails parcialmente ocultos. O envio real de códigos por SMS/e-mail não está embutido: antes de abrir o acesso público, conecte um provedor autorizado como Twilio, Resend, SendGrid ou equivalente e faça a verificação do código no servidor.

Vagas salvas têm um snapshot para continuarem acessíveis após expirar do feed. Currículos inseridos localmente não são incluídos no código nem enviados na publicação. A versão adaptada preserva o currículo-base; alterações feitas no editor de exportação ficam apenas no arquivo baixado.

## Próximas integrações

LinkedIn, Indeed e portais fechados podem virar conectores automáticos quando houver credenciais oficiais compatíveis com o caso de uso. Até lá, o sistema usa API pública, RSS oficial, GitHub Issues públicas e importação manual. Não são necessários segredos para Remotive, Himalayas, Remote OK, We Work Remotely ou FrontendBR. Uma implantação compartilhada entre duas contas requer configurar acesso e modelo de compartilhamento; não torne o espaço público para compartilhar currículos.
